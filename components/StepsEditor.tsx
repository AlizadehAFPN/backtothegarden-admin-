"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "@/i18n/LanguageContext";

interface StepsEditorProps {
  value: string[] | unknown;
  onChange: (steps: string[]) => void;
}

/** Steps are stored as a plain array of strings (see Recetas.steps). */
function normalizeSteps(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((s) => String(s ?? ""));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map((s) => String(s ?? ""));
    } catch {
      /* ignore */
    }
  }
  return [];
}

export default function StepsEditor({ value, onChange }: StepsEditorProps) {
  const { t } = useTranslation();
  const steps = useMemo(() => normalizeSteps(value), [value]);
  const listRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(steps.length);

  // When a step is appended, bring the new textarea into view and focus it so
  // the user sees it without having to scroll the modal manually.
  useEffect(() => {
    if (steps.length > prevLen.current) {
      const textareas = listRef.current?.querySelectorAll("textarea");
      const last = textareas?.[textareas.length - 1] as HTMLTextAreaElement | undefined;
      last?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      last?.focus();
    }
    prevLen.current = steps.length;
  }, [steps.length]);

  const updateAt = (index: number, text: string) => {
    const updated = [...steps];
    updated[index] = text;
    onChange(updated);
  };

  const remove = (index: number) => onChange(steps.filter((_, i) => i !== index));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
  };

  const add = () => onChange([...steps, ""]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-[var(--text-muted)]">
          {steps.length} {t("steps.items")}
        </span>
      </div>

      {steps.length > 0 && (
        <div ref={listRef} className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group flex items-start gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 hover:border-[var(--accent)]/30 transition"
            >
              <span className="flex-shrink-0 w-6 mt-2 text-center text-[11px] font-semibold text-[var(--text-muted)]">
                {i + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) => updateAt(i, e.target.value)}
                rows={2}
                placeholder={t("steps.placeholder")}
                className="flex-1 min-w-0 border border-[var(--border)] bg-[var(--surface)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-y"
              />
              <div className="flex-shrink-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  title="Move up"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  title="Move down"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-0.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 cursor-pointer"
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-emerald-50/30 transition cursor-pointer flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {t("steps.add")}
      </button>
    </div>
  );
}
