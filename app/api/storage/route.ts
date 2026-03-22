import { initializeApp, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// Ensure admin app is initialized (reuses the one from firebase-admin.ts)
import "@/lib/firebase-admin";

const bucket = getStorage(getApps()[0]).bucket(
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
);

const STORAGE_FOLDERS = ["videos", "recipes/videos", "masterclasses/videos"];

export async function GET() {
  try {
    const allFiles: {
      name: string;
      folder: string;
      url: string;
      size: number;
      contentType: string;
      timeCreated: string;
    }[] = [];

    for (const folder of STORAGE_FOLDERS) {
      const [files] = await bucket.getFiles({ prefix: `${folder}/` });

      for (const file of files) {
        // Skip folder placeholders
        if (file.name.endsWith("/")) continue;

        const [metadata] = await file.getMetadata();
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });

        allFiles.push({
          name: file.name.split("/").pop() || file.name,
          folder,
          url: signedUrl,
          size: Number(metadata.size || 0),
          contentType: String(metadata.contentType || ""),
          timeCreated: String(metadata.timeCreated || ""),
        });
      }
    }

    // Sort by newest first
    allFiles.sort(
      (a, b) =>
        new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime()
    );

    return Response.json({ files: allFiles });
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
    const { folder, name } = await request.json();
    if (!folder || !name) {
      return Response.json({ error: "Missing folder or name" }, { status: 400 });
    }

    const filePath = `${folder}/${name}`;
    await bucket.file(filePath).delete();

    return Response.json({ success: true });
  } catch (error) {
    console.error("Storage delete error:", error);
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
