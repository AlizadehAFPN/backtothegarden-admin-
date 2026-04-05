import { getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// Ensure admin app is initialized
import "@/lib/firebase-admin";

const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
const bucket = getStorage(getApps()[0]).bucket(bucketName);

function getDownloadUrl(filePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") || "";

    // Use delimiter to get only immediate children (like a file browser)
    const [allBucketFiles, , apiResponse] = await bucket.getFiles({
      prefix: prefix,
      delimiter: "/",
    });

    // Get subfolders from prefixes
    const prefixes: string[] =
      (apiResponse as { prefixes?: string[] })?.prefixes || [];

    const subfolders = prefixes.map((p: string) => {
      const trimmed = p.endsWith("/") ? p.slice(0, -1) : p;
      const parts = trimmed.split("/");
      return {
        name: parts[parts.length - 1],
        fullPath: p,
      };
    });

    // Get files (not folders)
    const files = allBucketFiles
      .filter((file) => !file.name.endsWith("/"))
      .map((file) => {
        const meta = file.metadata;
        const parts = file.name.split("/");
        const fileName = parts.pop() || file.name;

        // Get download token from metadata
        const token =
          (meta.metadata as Record<string, string>)?.firebaseStorageDownloadTokens || "";

        return {
          name: fileName,
          fullPath: file.name,
          url: token
            ? getDownloadUrl(file.name, token)
            : `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(file.name)}?alt=media`,
          size: Number(meta.size || 0),
          contentType: String(meta.contentType || ""),
          timeCreated: String(meta.timeCreated || ""),
        };
      });

    // Sort files by newest first
    files.sort(
      (a, b) =>
        new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime()
    );

    return Response.json({ files, subfolders, currentPrefix: prefix });
  } catch (error) {
    console.error("Storage list error:", error);
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { fullPath } = await request.json();
    if (!fullPath) {
      return Response.json({ error: "Missing fullPath" }, { status: 400 });
    }

    await bucket.file(fullPath).delete();

    return Response.json({ success: true });
  } catch (error) {
    console.error("Storage delete error:", error);
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
