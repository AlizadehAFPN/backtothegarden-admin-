/**
 * YouTube link handling shared by the admin forms and tables.
 *
 * The parsing rules mirror `getYoutubeVideoId` in the mobile app so a link that
 * the admin panel accepts is always a link the app can actually play.
 */

/** Extracts the video id from watch?v=, youtu.be/, /shorts/ and /embed/ links. */
export function getYoutubeVideoId(url: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  if (!/youtube\.com|youtu\.be/i.test(url)) return null;

  let videoId: string | undefined;
  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
  } else if (url.includes("/shorts/")) {
    videoId = url.split("/shorts/")[1]?.split(/[?&]/)[0];
  } else if (url.includes("/embed/")) {
    videoId = url.split("/embed/")[1]?.split(/[?&]/)[0];
  } else if (url.includes("v=")) {
    videoId = url.split("v=")[1]?.split("&")[0];
  }

  return videoId || null;
}

export function isYoutubeUrl(url: unknown): boolean {
  return getYoutubeVideoId(url) !== null;
}

/** Poster frame YouTube serves for every public video — used wherever a record
 * has a video instead of an uploaded image. */
export function getYoutubeThumbnail(url: unknown): string | null {
  const id = getYoutubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
