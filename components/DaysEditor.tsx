"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useCollection } from "@/lib/useCollection";
import ImageUploader from "./ImageUploader";
import Dropdown from "./Dropdown";

export interface PlanDay {
  name: string;
  dayNumber: string;
  image: string;
  /** Recipe document IDs (from the `Recetas` collection). */
  recipes: string[];
}

interface DaysEditorProps {
  value: PlanDay[] | unknown;
  onChange: (days: PlanDay[]) => void;
  storagePath?: string;
}

/** Extract a recipe document id from any stored recipe shape. */
function recipeRefToId(ref: unknown): string {
  if (!ref) return "";
  if (typeof ref === "string") {
    // "Recetas/x", "/Recetas/x" or a bare id.
    const parts = ref.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  }
  if (typeof ref === "object") {
    const o = ref as Record<string, unknown>;
    // Client-side DocumentReference exposes `id` / `path`.
    if (typeof o.id === "string") return o.id;
    if (typeof o.path === "string") {
      const parts = o.path.split("/").filter(Boolean);
      return parts[parts.length - 1] ?? "";
    }
    // Marker written back from this editor.
    if (typeof o.__ref === "string") {
      const parts = o.__ref.split("/").filter(Boolean);
      return parts[parts.length - 1] ?? "";
    }
    // Admin SDK serialized reference: { _path: { segments: [...] } }.
    const segments = (o._path as { segments?: unknown })?.segments;
    if (Array.isArray(segments) && segments.length) {
      return String(segments[segments.length - 1]);
    }
  }
  return "";
}

/** Normalize any stored `days` value into the editor's working shape. */
export function normalizeDays(value: unknown): PlanDay[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, i) => {
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const recipes = Array.isArray(o.recipes)
      ? o.recipes.map(recipeRefToId).filter(Boolean)
      : [];
    return {
      name: String(o.name ?? `Dia ${i + 1}`),
      dayNumber: String(o.dayNumber ?? i + 1),
      image: String(o.image ?? ""),
      recipes,
    };
  });
}

export default function DaysEditor({ value, onChange, storagePath = "mealplans/days" }: DaysEditorProps) {
  const { t } = useTranslation();
  const { data: recipes, loading: recipesLoading } = useCollection("Recetas");
  const [expanded, setExpanded] = useState<number | null>(0);

  const days = useMemo(() => normalizeDays(value), [value]);

  const recipeName = useMemo(() => {
    const map = new Map<string, string>();
    recipes.forEach((r) => map.set(r.id, String(r.name ?? r.id)));
    return map;
  }, [recipes]);

  const recipeOptions = useMemo(
    () =>
      recipes
        .map((r) => ({ value: r.id, label: String(r.name ?? r.id) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [recipes]
  );

  const updateDay = (index: number, patch: Partial<PlanDay>) => {
    onChange(days.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addDay = () => {
    const n = days.length + 1;
    onChange([...days, { name: `Dia ${n}`, dayNumber: String(n), image: "", recipes: [] }]);
    setExpanded(days.length);
  };

  const removeDay = (index: number) => {
    onChange(days.filter((_, i) => i !== index));
    setExpanded(null);
  };

  const moveDay = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= days.length) return;
    const updated = [...days];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
    setExpanded(target);
  };

  const addRecipe = (index: number, recipeId: string) => {
    if (!recipeId) return;
    const day = days[index];
    if (day.recipes.includes(recipeId)) return;
    updateDay(index, { recipes: [...day.recipes, recipeId] });
  };

  const removeRecipe = (dayIndex: number, recipeIndex: number) => {
    updateDay(dayIndex, { recipes: days[dayIndex].recipes.filter((_, i) => i !== recipeIndex) });
  };

  const moveRecipe = (dayIndex: number, recipeIndex: number, dir: -1 | 1) => {
    const target = recipeIndex + dir;
    const list = days[dayIndex].recipes;
    if (target < 0 || target >= list.length) return;
    const updated = [...list];
    [updated[recipeIndex], updated[target]] = [updated[target], updated[recipeIndex]];
    updateDay(dayIndex, { recipes: updated });
  };

  const inputClass =
    "w-full border border-[var(--border)] bg-white rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-[var(--text-muted)]">
          {days.length} {t("common.days")}
        </span>
      </div>

      <div className="space-y-2">
        {days.map((day, i) => {
          const isOpen = expanded === i;
          return (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
              {/* Day header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="flex flex-1 items-center gap-2.5 min-w-0 cursor-pointer text-left"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center text-[12px] font-semibold">
                    {day.dayNumber || i + 1}
                  </span>
                  {day.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={day.image} alt="" className="w-8 h-8 rounded-md object-cover border border-[var(--border)]" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{day.name || `Dia ${i + 1}`}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {day.recipes.length} {t("daysEditor.recipes")}
                    </p>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className={`ml-auto flex-shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="flex-shrink-0 flex items-center gap-0.5">
                  <button type="button" onClick={() => moveDay(i, -1)} disabled={i === 0} title={t("daysEditor.moveUp")}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button type="button" onClick={() => moveDay(i, 1)} disabled={i === days.length - 1} title={t("daysEditor.moveDown")}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button type="button" onClick={() => removeDay(i)} title={t("daysEditor.removeDay")}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 cursor-pointer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Day body */}
              {isOpen && (
                <div className="border-t border-[var(--border)] bg-[var(--background)]/40 px-3 py-3 space-y-3">
                  <div className="grid grid-cols-[90px_1fr] gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t("daysEditor.dayNumber")}</label>
                      <input type="text" value={day.dayNumber} onChange={(e) => updateDay(i, { dayNumber: e.target.value })} className={inputClass} placeholder="1" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t("daysEditor.dayName")}</label>
                      <input type="text" value={day.name} onChange={(e) => updateDay(i, { name: e.target.value })} className={inputClass} placeholder="Dia 1" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t("daysEditor.dayImage")}</label>
                    <ImageUploader value={day.image} onChange={(url) => updateDay(i, { image: url })} storagePath={storagePath} label={t("daysEditor.uploadImage")} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      {t("daysEditor.recipes")} ({day.recipes.length})
                    </label>
                    {day.recipes.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {day.recipes.map((rid, ri) => (
                          <div key={`${rid}-${ri}`} className="group flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-2.5 py-2">
                            <span className="flex-shrink-0 w-5 text-center text-[11px] font-semibold text-[var(--text-muted)]">{ri + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-[var(--text-primary)] truncate">{recipeName.get(rid) ?? rid}</p>
                              {!recipeName.has(rid) && (
                                <p className="text-[10px] text-amber-600 truncate">{t("daysEditor.missingRecipe")}</p>
                              )}
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-0.5">
                              <button type="button" onClick={() => moveRecipe(i, ri, -1)} disabled={ri === 0} title={t("daysEditor.moveUp")}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer">
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </button>
                              <button type="button" onClick={() => moveRecipe(i, ri, 1)} disabled={ri === day.recipes.length - 1} title={t("daysEditor.moveDown")}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer">
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </button>
                              <button type="button" onClick={() => removeRecipe(i, ri)} title={t("daysEditor.removeRecipe")}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 cursor-pointer">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Dropdown
                      options={recipeOptions}
                      value=""
                      onChange={(val) => addRecipe(i, val)}
                      placeholder={recipesLoading ? t("daysEditor.loadingRecipes") : t("daysEditor.addRecipe")}
                      searchPlaceholder={t("daysEditor.searchRecipes")}
                      emptyLabel={recipesLoading ? t("daysEditor.loadingRecipes") : t("common.noResults")}
                      ariaLabel={t("daysEditor.addRecipe")}
                      disabled={recipesLoading}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addDay}
        className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-emerald-50/30 transition cursor-pointer flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        {t("daysEditor.addDay")}
      </button>
    </div>
  );
}
