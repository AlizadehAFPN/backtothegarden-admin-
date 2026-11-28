// Server-side subscription checks against RevenueCat. Kept free of Next.js and
// Firebase imports so it can be tested on its own.

/** RevenueCat entitlement ids, as configured in the RevenueCat dashboard
 * (the mobile app uses the same ids in utils/subscription.js). */
export const ENTITLEMENT_BASIC = "Plan Básico";
export const ENTITLEMENT_PREMIUM = "Plan Premium";

export type UserType = "premium" | "basic" | "free";

export type Tier = { user_type: UserType; user_isMembresy: boolean };

/** One entitlement as returned by GET /v1/subscribers/{app_user_id}. The v1 API
 * lists every entitlement the customer ever had, including expired ones. */
export type RevenueCatEntitlement = {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
};

export type SubscriberEntitlements = Record<string, RevenueCatEntitlement>;

function isActive(entitlement: RevenueCatEntitlement, now: number): boolean {
  // No expiry date means a lifetime (non-subscription) purchase.
  if (entitlement.expires_date === null) return true;
  return [entitlement.expires_date, entitlement.grace_period_expires_date]
    .filter((date): date is string => Boolean(date))
    .some((date) => Date.parse(date) > now);
}

/**
 * The tier RevenueCat grants: Premium wins over Basic because both can be
 * active at once on Google Play. Returns null when RevenueCat has never issued
 * Basic or Premium to this customer, so a tier granted in the admin panel is
 * left alone (same rule as syncUserType in the app).
 */
export function tierFromEntitlements(
  entitlements: SubscriberEntitlements,
  now: number = Date.now(),
): Tier | null {
  const activeIds = Object.keys(entitlements).filter((id) => isActive(entitlements[id], now));
  const user_type: UserType = activeIds.includes(ENTITLEMENT_PREMIUM)
    ? "premium"
    : activeIds.includes(ENTITLEMENT_BASIC)
      ? "basic"
      : "free";
  if (user_type === "free" && !entitlements[ENTITLEMENT_BASIC] && !entitlements[ENTITLEMENT_PREMIUM]) {
    return null;
  }
  return { user_type, user_isMembresy: activeIds.length > 0 };
}

const ANONYMOUS_APP_USER_ID = /^\$RCAnonymousID:[0-9a-f]{32}$/;

/**
 * The RevenueCat customer a signed-in user may ask about: their own uid (iOS
 * calls Purchases.logIn(uid)) or a RevenueCat anonymous id (Android does not
 * log in, so purchases live on the device's anonymous id). Any other value is
 * refused, so nobody can claim another user's subscription by sending their uid.
 * Anonymous ids are random 128-bit values that only the device knows.
 */
export function allowedAppUserId(requested: unknown, uid: string): string | null {
  if (requested === undefined || requested === null || requested === "") return uid;
  if (typeof requested !== "string") return null;
  if (requested === uid || ANONYMOUS_APP_USER_ID.test(requested)) return requested;
  return null;
}

/** Reads a customer's entitlements from the RevenueCat REST API with a secret key. */
export async function fetchEntitlements(
  appUserId: string,
  secretKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubscriberEntitlements> {
  const response = await fetchImpl(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`RevenueCat responded with HTTP ${response.status}`);
  }
  const body = await response.json();
  return body?.subscriber?.entitlements ?? {};
}
