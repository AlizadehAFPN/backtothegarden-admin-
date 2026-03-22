import { adminDb } from "@/lib/firebase-admin";
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

export async function POST(request: Request) {
  const { collection, data } = await request.json();
  if (!collection || !data) {
    return Response.json({ error: "Missing collection or data" }, { status: 400 });
  }

  const docRef = await adminDb.collection(collection).add({
    ...convertDatetimes(data),
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ id: docRef.id });
}

export async function PUT(request: Request) {
  const { collection, id, data } = await request.json();
  if (!collection || !id || !data) {
    return Response.json({ error: "Missing collection, id, or data" }, { status: 400 });
  }

  await adminDb.collection(collection).doc(id).update(convertDatetimes(data));

  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const { collection, id } = await request.json();
  if (!collection || !id) {
    return Response.json({ error: "Missing collection or id" }, { status: 400 });
  }

  await adminDb.collection(collection).doc(id).delete();

  return Response.json({ success: true });
}
