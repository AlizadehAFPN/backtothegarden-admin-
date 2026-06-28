import { hasValidSession, unauthorized } from "@/lib/server-auth";

/**
 * POST /api/storage/upload-chunk
 *
 * Receives one chunk of a file from the browser and forwards it to GCS
 * using the resumable-upload session URI obtained from /api/storage/upload-session.
 *
 * The browser never talks directly to storage.googleapis.com, so no bucket-level
 * CORS configuration is required. Each chunk must be ≤ 3 MB so the request body
 * stays under Vercel's 4.5 MB serverless function limit.
 */
export async function POST(request: Request) {
  if (!hasValidSession(request)) return unauthorized();

  const form = await request.formData();
  const sessionUri = String(form.get("sessionUri") ?? "");
  const offset = Number(form.get("offset") ?? "0");
  const totalSize = Number(form.get("totalSize") ?? "0");
  const chunk = form.get("chunk") as Blob | null;

  if (!sessionUri || !chunk || totalSize === 0) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const chunkSize = chunk.size;
  const end = offset + chunkSize - 1;
  const buffer = Buffer.from(await chunk.arrayBuffer());

  // Forward the chunk to GCS using the Content-Range header.
  // GCS returns 308 for incomplete uploads and 200/201 when the upload is done.
  const gcsRes = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(buffer.byteLength),
      "Content-Range": `bytes ${offset}-${end}/${totalSize}`,
    },
    body: buffer,
  });

  if (gcsRes.status !== 200 && gcsRes.status !== 201 && gcsRes.status !== 308) {
    const text = await gcsRes.text();
    console.error("[upload-chunk] GCS error:", gcsRes.status, text);
    return Response.json(
      { error: `Chunk upload failed (${gcsRes.status})` },
      { status: 500 }
    );
  }

  return Response.json({ done: gcsRes.status === 200 || gcsRes.status === 201 });
}
