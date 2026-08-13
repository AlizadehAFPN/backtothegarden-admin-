import { adminDb, firestoreAdminMisconfiguredMessage } from "@/lib/firebase-admin";
import { sanitizeFirestoreData } from "@/lib/sanitize-firestore-data";
import { hasValidSession, unauthorized } from "@/lib/server-auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Recursively convert client-side markers into native Firestore values:
//   { __datetime: "ISO string" } -> Timestamp
//   { __ref: "Collection/docId" } -> DocumentReference
//   { type: "firestore/timestamp/1.0", seconds, nanoseconds } -> Timestamp
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
    // How the browser SDK serialises a Timestamp it read from Firestore. Fields
    // the form never edits (createdAt, mostly) travel back through here inside
    // the edited record; without this they would land as plain maps, and the app
    // both orders by and calls .toMillis() on them.
    if (
      obj.type === "firestore/timestamp/1.0" &&
      typeof obj.seconds === "number" &&
      typeof obj.nanoseconds === "number"
    ) {
      return new Timestamp(obj.seconds, obj.nanoseconds);
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

/** Firestore rejects these outright; catching them here gives a readable error. */
function invalidDocIdMessage(id: string): string | null {
  if (id.length === 0) return "Document id cannot be empty";
  if (id.includes("/")) return "Document id cannot contain '/'";
  if (id === "." || id === "..") return "Document id cannot be '.' or '..'";
  if (/^__.*__$/.test(id)) return "Document id cannot be surrounded by '__'";
  if (new TextEncoder().encode(id).length > 1500) return "Document id is too long";
  return null;
}

function isAlreadyExists(e: unknown): boolean {
  return (e as { code?: number | string })?.code === 6;
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
    const { collection: coll, data, id } = body as {
      collection?: string;
      data?: Record<string, unknown>;
      id?: string;
    };
    if (!coll || typeof coll !== "string") {
      return jsonError("Missing or invalid collection", 400);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonError("Missing or invalid data", 400);
    }
    // An explicit id is how a collection gets ordered for screens that read it
    // unsorted — Firestore returns those in document-id order.
    if (id !== undefined && typeof id !== "string") {
      return jsonError("Invalid id", 400);
    }
    const idProblem = id === undefined ? null : invalidDocIdMessage(id);
    if (idProblem) return jsonError(idProblem, 400);

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

    if (id) {
      try {
        // create() rather than set(): never silently overwrite an existing record.
        await adminDb.collection(coll).doc(id).create(payload);
      } catch (e) {
        if (isAlreadyExists(e)) {
          return jsonError(`A document with the id "${id}" already exists`, 409);
        }
        throw e;
      }
      return Response.json({ id });
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
    const { collection: coll, id, data, newId } = body as {
      collection?: string;
      id?: string;
      data?: Record<string, unknown>;
      newId?: string;
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
    if (newId !== undefined && typeof newId !== "string") {
      return jsonError("Invalid newId", 400);
    }
    const newIdProblem = newId === undefined ? null : invalidDocIdMessage(newId);
    if (newIdProblem) return jsonError(newIdProblem, 400);

    const missingAdminPut = firestoreAdminMisconfiguredMessage();
    if (missingAdminPut) return jsonError(missingAdminPut, 503);

    const cleaned = sanitizeFirestoreData(data) as Record<string, unknown>;
    const payload = convertMarkers(cleaned) as Record<string, unknown>;
    const docs = adminDb.collection(coll);

    // A document's id can carry its sort position (see lib/dateOrderedDocs.ts),
    // so moving a record means rewriting it under a new id. Ids are immutable in
    // Firestore: write the new one and drop the old one in a single atomic batch,
    // so the record can never end up duplicated or lost.
    if (newId && newId !== id) {
      const current = await docs.doc(id).get();
      if (!current.exists) return jsonError(`No document with the id "${id}"`, 404);

      const batch = adminDb.batch();
      batch.create(docs.doc(newId), { ...current.data(), ...payload });
      batch.delete(docs.doc(id));
      try {
        await batch.commit();
      } catch (e) {
        if (isAlreadyExists(e)) {
          return jsonError(`A document with the id "${newId}" already exists`, 409);
        }
        throw e;
      }
      return Response.json({ success: true, id: newId });
    }

    await docs.doc(id).update(payload);

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
