/**
 * Upload an image (File or Blob) to Firebase Storage through the server route
 * (`POST /api/storage`). The server uses the Admin SDK credentials that already
 * power Firestore writes, so this works even where the client custom-token flow
 * cannot sign tokens. Resolves with the public download URL. `onProgress` is 0–100.
 */
import { notifySessionExpired } from "./sessionExpiry";

export function uploadImageViaServer(
  data: File | Blob,
  fileName: string,
  storagePath: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", data, fileName);
    form.append("path", storagePath);
    form.append("filename", fileName);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/storage");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText) as { url?: string };
          if (body.url) resolve(body.url);
          else reject(new Error("Upload succeeded but no URL was returned"));
        } catch {
          reject(new Error("Unexpected server response"));
        }
      } else {
        if (xhr.status === 401) notifySessionExpired();
        let msg = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          if (body.error) msg = body.error;
        } catch {
          /* keep default */
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}
