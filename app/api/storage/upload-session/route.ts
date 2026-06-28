import { randomUUID } from "crypto";
import { getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { hasValidSession, unauthorized } from "@/lib/server-auth";
import "@/lib/firebase-admin";

const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;

function getDownloadUrl(filePath: string, token: string): string {
  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/` +
    `${encodeURIComponent(filePath)}?alt=media&token=${token}`
  );
}

/**
 * POST /api/storage/upload-session
 *
 * Creates a GCS resumable-upload session using the Admin SDK (bypasses Firebase
 * Storage security rules) and returns the opaque session URI plus the pre-computed
 * download URL. The browser never talks to storage.googleapis.com directly — it
 * sends chunks to /api/storage/upload-chunk, which forwards them server-side.
 */
export async function POST(request: Request) {
  if (!hasValidSession(request)) return unauthorized();

  let filename: string, contentType: string, storagePath: string;
  try {
    ({ filename, contentType, storagePath } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!filename || !contentType || !storagePath) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Accept video/*, image/*, and octet-stream (some browsers omit MIME on video files)
  const isAllowed =
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    contentType === "application/octet-stream";

  if (!isAllowed) {
    return Response.json(
      { error: "Only image and video files are allowed" },
      { status: 400 }
    );
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${storagePath.replace(/^\/+|\/+$/g, "")}/${Date.now()}_${safeName}`;
  const downloadToken = randomUUID();

  const bucket = getStorage(getApps()[0]).bucket(bucketName);

  const [sessionUri] = await bucket.file(objectPath).createResumableUpload({
    metadata: {
      contentType: contentType === "application/octet-stream" ? "video/mp4" : contentType,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  return Response.json({
    sessionUri,
    downloadUrl: getDownloadUrl(objectPath, downloadToken),
  });
}
