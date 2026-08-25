import type { DocData } from "./useCollection";

/**
 * Floating "live session" button shown on top of two app screens.
 *
 * One Firestore document per screen, read by the mobile app by document id —
 * so the ids below are part of the contract and must not be renamed.
 */
export const LIVE_SESSIONS_COLLECTION = "LiveSessions";

export const LIVE_SECTIONS = [
  {
    id: "videosExclusivos",
    labelKey: "liveSessions.sections.videosExclusivos",
    icon: "🎬",
  },
  {
    id: "sevenPillars",
    labelKey: "liveSessions.sections.sevenPillars",
    icon: "🏛️",
  },
] as const;

export type LiveSectionId = (typeof LIVE_SECTIONS)[number]["id"];

export interface LiveSession {
  /** Whether the floating button is rendered in the app at all. */
  enabled: boolean;
  /** Label inside the pill, e.g. "En Vivo". Empty falls back to the app default. */
  buttonLabel: string;
  /** External link (Zoom, Meet, YouTube Live…). Empty means "no session yet". */
  liveUrl: string;
  /** The link only opens from this moment on; before it the app shows the modal. */
  liveFrom: Date | null;
  /** Modal heading. */
  title: string;
  /** Modal body, e.g. "El live sobre … comenzará el jueves a las 10 AM." */
  message: string;
  /** Modal illustration. */
  image: string;
}

export const EMPTY_LIVE_SESSION: LiveSession = {
  enabled: false,
  buttonLabel: "",
  liveUrl: "",
  liveFrom: null,
  title: "",
  message: "",
  image: "",
};

/** Firestore Timestamps arrive from the browser SDK as `{ seconds, nanoseconds }`. */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = (value as { seconds: unknown }).seconds;
    if (typeof seconds === "number") return new Date(seconds * 1000);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readLiveSession(doc: DocData | undefined): LiveSession {
  if (!doc) return EMPTY_LIVE_SESSION;
  return {
    enabled: Boolean(doc.enabled),
    buttonLabel: toText(doc.buttonLabel),
    liveUrl: toText(doc.liveUrl),
    liveFrom: toDate(doc.liveFrom),
    title: toText(doc.title),
    message: toText(doc.message),
    image: toText(doc.image),
  };
}

export type LiveSessionStatus =
  /** Button hidden in the app. */
  | "off"
  /** Button visible, tapping it leaves the app for `liveUrl`. */
  | "live"
  /** Link is set but `liveFrom` is still in the future — the modal shows instead. */
  | "scheduled"
  /** Button visible with no link at all — the modal shows. */
  | "noLink";

export function liveSessionStatus(
  session: LiveSession,
  now: Date = new Date()
): LiveSessionStatus {
  if (!session.enabled) return "off";
  if (!session.liveUrl) return "noLink";
  if (session.liveFrom && session.liveFrom.getTime() > now.getTime()) {
    return "scheduled";
  }
  return "live";
}

const STATUS_CLASSES: Record<LiveSessionStatus, string> = {
  off: "bg-[var(--background)] text-[var(--text-muted)] border-[var(--border)]",
  live: "bg-red-50 text-red-600 border-red-200",
  scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  noLink: "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent-light)]",
};

export function liveStatusClass(status: LiveSessionStatus): string {
  return STATUS_CLASSES[status];
}
