import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { adminDb, firestoreAdminMisconfiguredMessage } from "@/lib/firebase-admin";
import { allowedAppUserId, fetchEntitlements, tierFromEntitlements } from "@/lib/revenuecat";

/**
 * Called by the mobile app on launch and after a purchase or restore. Checks
 * the caller's subscription with RevenueCat and saves the resulting tier to
 * Users/{uid}.
 *
 * This is the only writer of user_type / user_isMembresy besides the admin
 * panel itself: once firestore.rules locks those fields, a user can't grant
 * themselves a tier from the app.
 *
 * Auth: `Authorization: Bearer <Firebase ID token>` of a signed-in, non-guest user.
 * Body: `{ "appUserId": "<Purchases.getAppUserID()>" }` (optional, defaults to the uid).
 */
export async function POST(request: Request) {
  const idToken = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!idToken) {
    return Response.json({ error: "Missing Firebase ID token." }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuth(getApps()[0]).verifyIdToken(idToken);
    if (decoded.firebase?.sign_in_provider === "anonymous") {
      return Response.json({ error: "Guests can't have a subscription." }, { status: 403 });
    }
    uid = decoded.uid;
  } catch {
    return Response.json({ error: "Invalid or expired Firebase ID token." }, { status: 401 });
  }

  const secretKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secretKey) {
    console.error("[subscription-sync] REVENUECAT_SECRET_API_KEY is not set (see .env.example).");
    return Response.json({ error: "Subscription sync is not configured." }, { status: 503 });
  }
  const misconfigured = firestoreAdminMisconfiguredMessage();
  if (misconfigured) {
    return Response.json({ error: misconfigured }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const appUserId = allowedAppUserId(body?.appUserId, uid);
  if (!appUserId) {
    return Response.json(
      { error: "appUserId must be your uid or a RevenueCat anonymous id." },
      { status: 400 },
    );
  }

  let tier;
  try {
    tier = tierFromEntitlements(await fetchEntitlements(appUserId, secretKey));
  } catch (error) {
    console.error(
      "[subscription-sync] RevenueCat lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return Response.json({ error: "Could not check the subscription." }, { status: 502 });
  }

  const userRef = adminDb.doc(`Users/${uid}`);
  try {
    if (!tier) {
      // RevenueCat never issued a tier to this customer: keep what the admin panel set.
      const snapshot = await userRef.get();
      return Response.json({
        changed: false,
        user_type: snapshot.get("user_type") ?? "free",
        user_isMembresy: snapshot.get("user_isMembresy") ?? false,
      });
    }
    await userRef.set(tier, { merge: true });
    return Response.json({ changed: true, ...tier });
  } catch (error) {
    console.error(
      "[subscription-sync] Firestore write failed:",
      error instanceof Error ? error.message : error,
    );
    return Response.json({ error: "Could not save the subscription." }, { status: 500 });
  }
}
