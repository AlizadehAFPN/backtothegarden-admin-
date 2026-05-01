import { adminDb, firestoreAdminMisconfiguredMessage } from "@/lib/firebase-admin";
import { sanitizeFirestoreData } from "@/lib/sanitize-firestore-data";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Convert { __datetime: "ISO string" } markers to Firestore Timestamps
function convertDatetimes(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      value &&
      typeof value === "object" &&
      "__datetime" in (value as Record<string, unknown>)
    ) {
      result[key] = Timestamp.fromDate(
        new Date((value as { __datetime: string }).__datetime)
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function firestoreWriteErrorMessage(e: unknown): string {
  let msg: string;
  if (e instanceof Error) {
    const any = e as Error & { code?: number | string; details?: string };
    const parts = [String(any.message)];
    if (any.code !== undefined) parts.unshift(`[${any.code}]`);
    if (typeof any.details === "string" && any.details) parts.push(any.details);
    msg = parts.join(" ");
  } else {
    msg = String(e);
  }
  if (
    msg.includes("invalid_rapt") ||
    msg.includes("invalid_grant") ||
    msg.includes("Getting metadata from plugin failed")
  ) {
    msg +=
      " — This is not your hosting provider: Google user / gcloud login failed (invalid_rapt). The Firebase Admin SDK needs a service account JSON, not your Google password. " +
      "Localhost: in .env.local set GOOGLE_APPLICATION_CREDENTIALS=./path/to/key.json OR FIREBASE_SERVICE_ACCOUNT_KEY=<one-line JSON> (Firebase Console → Project settings → Service accounts → Generate new private key). " +
      "Use credentials for the same Firebase project as NEXT_PUBLIC_FIREBASE_PROJECT_ID (your staging project). Restart next dev. " +
      "Hosted apps: set the same variables in your deployment environment (Preview = staging branch, Production = prod).";
  }
  return msg;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }
    const { collection: coll, data } = body as {
      collection?: string;
      data?: Record<string, unknown>;
    };
    if (!coll || typeof coll !== "string") {
      return jsonError("Missing or invalid collection", 400);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonError("Missing or invalid data", 400);
    }

    const missingAdmin = firestoreAdminMisconfiguredMessage();
    if (missingAdmin) return jsonError(missingAdmin, 503);

    const cleaned = sanitizeFirestoreData(data) as Record<string, unknown>;
    const payload = convertDatetimes(cleaned);

    const docRef = await adminDb.collection(coll).add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ id: docRef.id });
  } catch (e) {
    const message = firestoreWriteErrorMessage(e);
    console.error("[firestore POST]", message);
    return jsonError(message, 500);
  }
}

export async function PUT(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }
    const { collection: coll, id, data } = body as {
      collection?: string;
      id?: string;
      data?: Record<string, unknown>;
    };
    if (!coll || typeof coll !== "string") {
      return jsonError("Missing or invalid collection", 400);
    }
    if (!id || typeof id !== "string") {
      return jsonError("Missing or invalid id", 400);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonError("Missing or invalid data", 400);
    }

    const missingAdminPut = firestoreAdminMisconfiguredMessage();
    if (missingAdminPut) return jsonError(missingAdminPut, 503);

    const cleaned = sanitizeFirestoreData(data) as Record<string, unknown>;
    await adminDb.collection(coll).doc(id).update(convertDatetimes(cleaned));

    return Response.json({ success: true });
  } catch (e) {
    const message = firestoreWriteErrorMessage(e);
    console.error("[firestore PUT]", message);
    return jsonError(message, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }
    const { collection: coll, id } = body as { collection?: string; id?: string };
    if (!coll || typeof coll !== "string") {
      return jsonError("Missing or invalid collection", 400);
    }
    if (!id || typeof id !== "string") {
      return jsonError("Missing or invalid id", 400);
    }

    const missingAdminDel = firestoreAdminMisconfiguredMessage();
    if (missingAdminDel) return jsonError(missingAdminDel, 503);

    await adminDb.collection(coll).doc(id).delete();

    return Response.json({ success: true });
  } catch (e) {
    const message = firestoreWriteErrorMessage(e);
    console.error("[firestore DELETE]", message);
    return jsonError(message, 500);
  }
}
