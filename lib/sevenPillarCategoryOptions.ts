import type { DocData } from "./useCollection";

export type CategorySelectOption = { value: string; label: string };

/**
 * Builds select options from Firestore `sevenPillars` (`key` → stored value, `label` → UI).
 * Appends any extra `category` strings already on documents (legacy / migration).
 */
export function selectOptionsFromSevenPillars(
  items: DocData[],
  pillars: DocData[]
): CategorySelectOption[] {
  const fromPillars = pillars.map((p) => ({
    value: String(p.key ?? p.id),
    label: String(p.label ?? p.key ?? p.id),
  }));
  const seen = new Set(fromPillars.map((p) => p.value));
  items.forEach((item) => {
    const cat = item.category;
    if (typeof cat === "string" && cat.length > 0 && !seen.has(cat)) {
      fromPillars.push({ value: cat, label: cat });
      seen.add(cat);
    }
  });
  return fromPillars.sort((a, b) => a.label.localeCompare(b.label));
}
