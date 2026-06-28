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

// CORS is set on the bucket once per process lifetime (idempotent on the bucket).
let corsReady = false;

async function ensureStorageCors(
  bucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>
) {
  if (corsReady) return;
  try {
    await bucket.setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET", "PUT", "POST", "HEAD"],
        responseHeader: ["Content-Type", "Content-Range", "Range", "Accept-Ranges"],
        maxAgeSeconds: 3600,
      },
    ]);
  } catch (e) {
    // Log but don't block — bucket CORS may already be set correctly.
    console.warn("[upload-session] setCorsConfiguration failed (may already be set):", e);
  }
  corsReady = true;
}

/**
 * POST /api/storage/upload-session
 *
 * 1. Configures bucket CORS so browsers can PUT directly to storage.googleapis.com.
 * 2. Creates a GCS JSON API resumable-upload session via the Admin SDK.
 * 3. Returns { sessionUri, downloadUrl } to the client.
 *
 * The client PUTs the file straight to `sessionUri` (storage.googleapis.com),
 * bypassing Vercel's 4.5 MB request-body limit entirely.
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

  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    return Response.json(
      { error: "Only image and video files are allowed" },
      { status: 400 }
    );
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${storagePath.replace(/^\/+|\/+$/g, "")}/${Date.now()}_${safeName}`;
  const downloadToken = randomUUID();

  const bucket = getStorage(getApps()[0]).bucket(bucketName);

  // Ensure bucket-level CORS is set so browsers can PUT to storage.googleapis.com.
  await ensureStorageCors(bucket);

  // createResumableUpload uses the GCS JSON API and returns a session URI at
  // storage.googleapis.com. The client PUTs to it with only Content-Type — no
  // X-Goog-Upload-* headers required for a single-chunk upload.
  const [sessionUri] = await bucket.file(objectPath).createResumableUpload({
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  return Response.json({
    sessionUri,
    downloadUrl: getDownloadUrl(objectPath, downloadToken),
  });
}
