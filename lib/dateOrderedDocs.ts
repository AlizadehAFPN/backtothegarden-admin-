import type { DocData } from "./useCollection";

/**
 * Ordering by document id, for the collections the app reads unsorted.
 *
 * The mobile app loads GuiasPDF and Tienda with a plain collection query and no
 * `orderBy` (`CarouselGuiasPDF.jsx`, `CarouselTiendaPDF.jsx`, `tiendaView.jsx`),
 * and Firestore returns such a query in ascending document-id order. The id is
 * therefore the sort key those screens actually use, so encoding an inverted
 * timestamp in it puts the newest item first on the home screen — without
 * shipping a new app build.
 *
 * Every id that predates this scheme starts with "7" or later, so a new key
 * (always "0…") sorts ahead of all of them.
 */

/** Milliseconds. Keeps the key 14 chars with a leading zero until the year 2286. */
const INVERT_BASE = 9_999_999_999_999;
const KEY_LENGTH = 14;

/** Inverted timestamp: a later date yields a smaller, earlier-sorting key. */
export function orderKeyFromDate(date: Date): string {
  const ms = date.getTime();
  if (!Number.isFinite(ms)) throw new Error("Invalid date");
  // Clamped so an absurd date can never produce a negative (unsortable) key.
  const inverted = Math.min(Math.max(INVERT_BASE - ms, 0), INVERT_BASE);
  return String(inverted).padStart(KEY_LENGTH, "0");
}

/** The order key an id carries, or null for ids created before this scheme. */
export function orderKeyOf(id: string): string | null {
  return /^(\d{14})(?:-|$)/.exec(id)?.[1] ?? null;
}

/** Readable tail so ids stay recognisable in the console and in exports. */
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function orderedDocId(date: Date, name: string): string {
  const key = orderKeyFromDate(date);
  const slug = slugify(name);
  return slug ? `${key}-${slug}` : key;
}

/**
 * Reads the value a `datetime` field submits. FormModal hands dates over as a
 * `{ __datetime }` marker that the API converts to a Firestore Timestamp.
 */
export function dateFromFormValue(value: unknown): Date | null {
  if (!value || typeof value !== "object" || !("__datetime" in value)) return null;
  const date = new Date(String((value as { __datetime: unknown }).__datetime));
  return Number.isNaN(date.getTime()) ? null : date;
}

interface SaveArgs {
  formData: Record<string, unknown>;
  editing: DocData | null;
  add: (data: Record<string, unknown>, options?: { id?: string }) => Promise<void>;
  update: (
    id: string,
    data: Record<string, unknown>,
    options?: { newId?: string }
  ) => Promise<void>;
  /** Date field the id is built from. */
  dateKey: string;
  /** Field used for the readable part of the id. */
  nameKey: string;
}

/**
 * Saves a record whose position in the app comes from its document id.
 *
 * New records always get a date (defaulting to now) so they land at the top.
 * Editing an old record that has no date leaves its id — and therefore its
 * position — untouched; giving it a date moves it where that date belongs.
 */
export async function saveDateOrdered({
  formData,
  editing,
  add,
  update,
  dateKey,
  nameKey,
}: SaveArgs): Promise<void> {
  const date = dateFromFormValue(formData[dateKey]) ?? (editing ? null : new Date());

  if (!date) {
    // Empty date: let the record keep whatever the server already stored.
    delete formData[dateKey];
    if (editing) await update(editing.id, formData);
    else await add(formData);
    return;
  }

  formData[dateKey] = { __datetime: date.toISOString() };
  const name = String(formData[nameKey] ?? "");

  if (!editing) {
    await add(formData, { id: orderedDocId(date, name) });
    return;
  }

  // Only the date drives the order, so a rename must not move the record.
  const needsRekey = orderKeyOf(editing.id) !== orderKeyFromDate(date);
  await update(
    editing.id,
    formData,
    needsRekey ? { newId: orderedDocId(date, name) } : undefined
  );
}
