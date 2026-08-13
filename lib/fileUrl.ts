/**
 * Reading a stored file URL as a file. Firebase Storage download URLs keep the
 * object path percent-encoded after `/o/`, so the name and extension only
 * become visible once that segment is decoded.
 */

/** Decoded object path, e.g. `data/guias_pdf/Guía de ayuno intermitente.pdf`. */
function decodedPath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const { pathname } = new URL(trimmed);
    const marker = "/o/";
    const start = pathname.indexOf(marker);
    return decodeURIComponent(
      start >= 0 ? pathname.slice(start + marker.length) : pathname
    );
  } catch {
    // Not an absolute URL, or a malformed percent sequence.
    return null;
  }
}

/** File name a URL points at, or `""` when it cannot be derived. */
export function fileNameFromUrl(url: string): string {
  const path = decodedPath(url);
  if (!path) return "";
  return path.split("/").filter(Boolean).pop() ?? "";
}

export type FileKind = "pdf" | "other" | "unknown";

/**
 * `"unknown"` when the URL carries no extension — signed links and redirects
 * routinely hide it, so callers must not report those as the wrong file type.
 */
export function fileKindFromUrl(url: string): FileKind {
  const extension = /\.([a-z0-9]+)$/i.exec(fileNameFromUrl(url))?.[1];
  if (!extension) return "unknown";
  return extension.toLowerCase() === "pdf" ? "pdf" : "other";
}
