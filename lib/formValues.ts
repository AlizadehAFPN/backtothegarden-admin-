import type { FieldConfig } from "@/components/FormModal";
import type { DocData } from "./useCollection";

/**
 * What the shared FormModal does with the record it is given.
 *
 * - `create`: empty form; saving adds a new record.
 * - `edit`: filled from a record; saving writes over that record.
 * - `duplicate`: filled from a record; saving adds a new record and never
 *   touches the one it was copied from.
 */
export type FormMode = "create" | "edit" | "duplicate";

const TITLE_SUFFIX: Record<FormMode, string> = {
  create: "newTitle",
  edit: "editTitle",
  duplicate: "duplicateTitle",
};

/** i18n key of the modal title for a section, e.g. `videos.duplicateTitle`. */
export function formTitleKey(section: string, mode: FormMode): string {
  return `${section}.${TITLE_SUFFIX[mode]}`;
}

/** Local "YYYY-MM-DDTHH:mm" string — the value format of a `datetime` field. */
export function toDatetimeLocal(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Starting values of an empty "New …" form. */
export function blankFormValues(fields: FieldConfig[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  fields.forEach((f) => {
    if (f.type === "checkbox") values[f.key] = Boolean(f.defaultChecked);
    else if (f.type === "ingredients" || f.type === "steps" || f.type === "days") values[f.key] = [];
    else values[f.key] = "";
  });
  return values;
}

/**
 * Starting values for a copy of `record`: an empty "New …" form with the
 * record's values filled in, so saving it gives exactly the record that typing
 * those values into "New …" would have.
 *
 * - Only what the form shows is copied, plus the field an upload writes its
 *   detected duration to. The id and anything else stored on the record
 *   (counters, the createdAt the server stamps) stay behind.
 * - Date fields start at `now` rather than at the record's date, so the copy is
 *   ordered as new content instead of inheriting an old or scheduled date.
 * - Uploaded files are copied as URLs, so both records point at the same
 *   stored file. That is safe: deleting a record, or removing/replacing a file
 *   in the form, never deletes the stored file itself.
 */
export function duplicateFormValues(
  record: DocData,
  fields: FieldConfig[],
  now: Date
): Record<string, unknown> {
  const values = blankFormValues(fields);

  const keys = new Set<string>();
  fields.forEach((f) => {
    keys.add(f.key);
    if (f.durationField) keys.add(f.durationField);
  });
  keys.forEach((key) => {
    const value = record[key];
    // A missing or null value keeps the empty-form default, as "New …" would.
    if (value !== undefined && value !== null) values[key] = value;
  });

  fields.forEach((f) => {
    if (f.type === "datetime") values[f.key] = toDatetimeLocal(now);
  });

  return values;
}
