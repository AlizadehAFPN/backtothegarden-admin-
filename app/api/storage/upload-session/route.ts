import { randomUUID } from "crypto";
import { getApps } from "firebase-admin/app";
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
 * Returns a Firebase Storage resumable-upload session URI plus the future
 * download URL. The client can then PUT the file bytes directly to the
 * session URI (firebasestorage.googleapis.com — CORS-enabled by Firebase),
 * which completely avoids Vercel's 4.5 MB request-body limit.
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

  // Retrieve an OAuth2 access token from the Admin SDK credential.
  const app = getApps()[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { access_token } = await (app.options.credential as any).getAccessToken();

  // Initiate a resumable upload via the Firebase Storage REST API.
  // Using firebasestorage.googleapis.com (not storage.googleapis.com) ensures
  // CORS is pre-configured by Firebase so the browser can PUT directly.
  const initUrl =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o` +
    `?name=${encodeURIComponent(objectPath)}&uploadType=resumable`;

  const initRes = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Type": contentType,
    },
    body: JSON.stringify({
      name: objectPath,
      contentType,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    }),
  });

  if (!initRes.ok) {
    const text = await initRes.text();
    console.error("[upload-session] Firebase Storage init failed:", text);
    return Response.json(
      { error: `Failed to initiate upload (${initRes.status})` },
      { status: 500 }
    );
  }

  const sessionUri =
    initRes.headers.get("X-Goog-Upload-URL") ??
    initRes.headers.get("Location");

  if (!sessionUri) {
    console.error("[upload-session] No session URI in response headers");
    return Response.json({ error: "No upload session URI returned" }, { status: 500 });
  }

  return Response.json({
    sessionUri,
    downloadUrl: getDownloadUrl(objectPath, downloadToken),
  });
}
