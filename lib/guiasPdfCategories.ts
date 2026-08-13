import type { DocData } from "./useCollection";

export interface GuiasPdfCategoryOption {
  value: string;
  label: string;
}

/**
 * The mobile app lists guides under exactly two tabs — `guias` ("Guias") and
 * `pdf` ("PDFs") — and both show the cover `image` plus a "Descargar Pdf"
 * button for `pdfURL`. The tab is the only difference between them, so the
 * admin form asks for the same files either way.
 */
export const GUIAS_PDF_CATEGORIES = ["guias", "pdf"] as const;

export type GuiasPdfCategory = (typeof GUIAS_PDF_CATEGORIES)[number];

export function isGuiasPdfCategory(value: string): value is GuiasPdfCategory {
  return (GUIAS_PDF_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Category values already saved on documents that aren't one of the two the app
 * knows about. Returned sorted so the result is stable across snapshots.
 */
export function extraCategoryKeys(items: DocData[]): string[] {
  const extras = new Set<string>();
  items.forEach((item) => {
    const category = item.category;
    if (typeof category === "string" && category && !isGuiasPdfCategory(category)) {
      extras.add(category);
    }
  });
  return [...extras].sort();
}

/**
 * Select options for the category field. Unknown values found on existing
 * documents are appended as-is so editing a record can never silently drop one.
 */
export function guiasPdfCategoryOptions(
  extraKeys: string[],
  label: (category: GuiasPdfCategory) => string
): GuiasPdfCategoryOption[] {
  return [
    ...GUIAS_PDF_CATEGORIES.map((category) => ({
      value: category,
      label: label(category),
    })),
    ...extraKeys.map((key) => ({ value: key, label: key })),
  ];
}

export function guiasPdfCategoryLabel(
  value: string,
  label: (category: GuiasPdfCategory) => string
): string {
  return isGuiasPdfCategory(value) ? label(value) : value;
}
