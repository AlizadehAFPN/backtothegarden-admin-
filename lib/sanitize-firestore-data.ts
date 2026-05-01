/** Remove values Firestore rejects (undefined, NaN) from nested structures. */
export function sanitizeFirestoreData(input: unknown): unknown {
  if (input === undefined) return undefined;
  if (typeof input === "number" && Number.isNaN(input)) return undefined;
  if (input === null || typeof input !== "object") return input;
  if (Array.isArray(input)) {
    return input
      .map((item) => sanitizeFirestoreData(item))
      .filter((item) => item !== undefined);
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined) continue;
    const next = sanitizeFirestoreData(value);
    if (next !== undefined) out[key] = next;
  }
  return out;
}
