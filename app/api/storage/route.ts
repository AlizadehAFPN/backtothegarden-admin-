import { getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// Ensure admin app is initialized
import "@/lib/firebase-admin";

const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
const bucket = getStorage(getApps()[0]).bucket(bucketName);

function getPublicUrl(filePath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder");

    const options: { prefix?: string } = {};
    if (folder) {
      options.prefix = `${folder}/`;
    }

    const [allBucketFiles] = await bucket.getFiles(options);

    const allFiles = allBucketFiles
      .filter((file) => !file.name.endsWith("/"))
      .map((file) => {
        const meta = file.metadata;
        const parts = file.name.split("/");
        const fileName = parts.pop() || file.name;
        const fileFolder = parts.join("/") || "/";

        return {
          name: fileName,
          folder: fileFolder,
          fullPath: file.name,
          url: getPublicUrl(file.name),
          size: Number(meta.size || 0),
          contentType: String(meta.contentType || ""),
          timeCreated: String(meta.timeCreated || ""),
        };
      });

    // Sort by newest first
    allFiles.sort(
      (a, b) =>
        new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime()
    );

    // Get unique folders
    const folders = [...new Set(allFiles.map((f) => f.folder))].sort();

    return Response.json({ files: allFiles, folders });
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
