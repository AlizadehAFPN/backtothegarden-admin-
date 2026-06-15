import { adminDb, firestoreAdminMisconfiguredMessage } from "@/lib/firebase-admin";
import { sanitizeFirestoreData } from "@/lib/sanitize-firestore-data";
import { hasValidSession, unauthorized } from "@/lib/server-auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Recursively convert client-side markers into native Firestore values:
//   { __datetime: "ISO string" } -> Timestamp
//   { __ref: "Collection/docId" } -> DocumentReference
// Markers can appear at any depth (e.g. recipe references nested inside
// MealPlans.days[].recipes[]), so this walks arrays and nested objects.
function convertMarkers(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(convertMarkers);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__datetime === "string") {
      return Timestamp.fromDate(new Date(obj.__datetime));
    }
    if (typeof obj.__ref === "string") {
      // Normalize a possible leading slash, e.g. "/Recetas/x" -> "Recetas/x".
      return adminDb.doc(obj.__ref.replace(/^\/+/, ""));
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = convertMarkers(val);
    }
    return result;
  }
  return value;
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
    if (!hasValidSession(request)) return unauthorized();
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
    const payload = convertMarkers(cleaned) as Record<string, unknown>;

    // Respect a client-supplied createdAt (e.g. recipes let admins set it);
    // otherwise stamp it with the server clock.
    if (
      payload.createdAt === undefined ||
      payload.createdAt === null ||
      payload.createdAt === ""
    ) {
      payload.createdAt = FieldValue.serverTimestamp();
    }

    const docRef = await adminDb.collection(coll).add(payload);

    return Response.json({ id: docRef.id });
  } catch (e) {
    const message = firestoreWriteErrorMessage(e);
    console.error("[firestore POST]", message);
    return jsonError(message, 500);
  }
}

export async function PUT(request: Request) {
  try {
    if (!hasValidSession(request)) return unauthorized();
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
    await adminDb
      .collection(coll)
      .doc(id)
      .update(convertMarkers(cleaned) as Record<string, unknown>);

    return Response.json({ success: true });
  } catch (e) {
    const message = firestoreWriteErrorMessage(e);
    console.error("[firestore PUT]", message);
    return jsonError(message, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!hasValidSession(request)) return unauthorized();
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
