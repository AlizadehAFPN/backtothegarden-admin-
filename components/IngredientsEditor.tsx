"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useCollection } from "@/lib/useCollection";

interface Ingredient {
  cantidad: string;
  categoria: string;
  descripcion: string;
}

interface IngredientsEditorProps {
  value: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
}

export default function IngredientsEditor({ value, onChange }: IngredientsEditorProps) {
  const { t } = useTranslation();
  const { data: recipeCategories } = useCollection("recipeCategories");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Ingredient>({ cantidad: "", categoria: "", descripcion: "" });

  const ingredients = Array.isArray(value) ? value : [];

  const categoryOptions = useMemo(() => {
    const fromCollection = recipeCategories.map((c) => String(c.name ?? c.label ?? c.id));
    ingredients.forEach((ing) => {
      if (ing.categoria && !fromCollection.includes(ing.categoria)) {
        fromCollection.push(ing.categoria);
      }
    });
    return [...new Set(fromCollection)].sort();
  }, [recipeCategories, ingredients]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...ingredients];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
    if (editingIndex === index) setEditingIndex(index - 1);
    else if (editingIndex === index - 1) setEditingIndex(index);
  };

  const moveDown = (index: number) => {
    if (index >= ingredients.length - 1) return;
    const updated = [...ingredients];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
    if (editingIndex === index) setEditingIndex(index + 1);
    else if (editingIndex === index + 1) setEditingIndex(index);
  };

  const handleInsert = () => {
    if (insertAtIndex === null || !form.descripcion.trim()) return;
    const updated = [...ingredients];
    updated.splice(insertAtIndex, 0, { ...form });
    onChange(updated);
    resetForm();
  };

  const handleAddEnd = () => {
    if (!form.descripcion.trim()) return;
    onChange([...ingredients, { ...form }]);
    resetForm();
  };

  const handleUpdate = () => {
    if (editingIndex === null || !form.descripcion.trim()) return;
    const updated = [...ingredients];
    updated[editingIndex] = { ...form };
    onChange(updated);
    resetForm();
  };

  const handleRemove = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
    if (editingIndex === index) resetForm();
  };

  const startEdit = (index: number) => {
    setForm({ ...ingredients[index] });
    setEditingIndex(index);
    setInsertAtIndex(null);
  };

  const startInsert = (atIndex: number) => {
    setForm({ cantidad: "", categoria: "", descripcion: "" });
    setInsertAtIndex(atIndex);
    setEditingIndex(null);
  };

  const resetForm = () => {
    setForm({ cantidad: "", categoria: "", descripcion: "" });
    setEditingIndex(null);
    setInsertAtIndex(null);
  };

  const inputClass =
    "w-full border border-[var(--border)] bg-white rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent";

  const isFormOpen = editingIndex !== null || insertAtIndex !== null;

  const renderForm = (mode: "insert" | "edit" | "add") => (
    <div className="rounded-xl border border-[var(--accent)] bg-emerald-50/30 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider">
          {mode === "edit" ? "Edit Ingredient" : mode === "insert" ? "Insert Ingredient" : "New Ingredient"}
        </span>
      </div>
      <div className="grid grid-cols-[80px_1fr] gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t("ingredients.quantity")}</label>
          <input
            type="text"
            value={form.cantidad}
            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            placeholder="1, 1/2..."
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t("ingredients.description")}</label>
          <input
            type="text"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder={t("ingredients.descriptionPlaceholder")}
            className={inputClass}
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{t("ingredients.category")}</label>
        <select
          value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          className={inputClass}
        >
          <option value="">{t("form.select")}</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={resetForm} className="px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-gray-100 cursor-pointer">
          {t("form.cancel")}
        </button>
        <button
          type="button"
          onClick={mode === "edit" ? handleUpdate : mode === "insert" ? handleInsert : handleAddEnd}
          className="px-4 py-1.5 text-[12px] font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] cursor-pointer shadow-sm"
        >
          {mode === "edit" ? t("form.update") : t("ingredients.add")}
        </button>
      </div>
    </div>
  );

  const renderInsertLine = (atIndex: number) => (
    <button
      type="button"
      onClick={() => startInsert(atIndex)}
      className="group/insert w-full flex items-center gap-2 py-1 cursor-pointer"
      title="Insert ingredient here"
    >
      <div className="flex-1 h-px bg-transparent group-hover/insert:bg-[var(--accent)]/40 transition" />
      <div className="flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 transition text-[var(--accent)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-wider">Insert</span>
      </div>
      <div className="flex-1 h-px bg-transparent group-hover/insert:bg-[var(--accent)]/40 transition" />
    </button>
  );

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-[var(--text-muted)]">
          {ingredients.length} {t("ingredients.items")}
        </span>
      </div>

      {/* Ingredient list */}
      {ingredients.length > 0 && (
        <div className="space-y-0 max-h-[400px] overflow-y-auto pr-1">
          {ingredients.map((ing, i) => {
            const isBeingEdited = editingIndex === i;
            const isInsertingHere = insertAtIndex === i;

            return (
              <div key={i}>
                {/* Insert line before this item */}
                {!isFormOpen && renderInsertLine(i)}
                {isInsertingHere && renderForm("insert")}

                {isBeingEdited ? (
                  renderForm("edit")
                ) : (
                  <div className="group flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white hover:border-[var(--accent)]/30 hover:shadow-sm px-3 py-2.5 transition">
                    {/* Order number */}
                    <span className="flex-shrink-0 w-6 text-center text-[11px] font-semibold text-[var(--text-muted)]">
                      {i + 1}
                    </span>

                    {/* Move up/down */}
                    <div className="flex-shrink-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => moveUp(i)}
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
                        onClick={() => moveDown(i)}
                        disabled={i === ingredients.length - 1}
                        className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                        title="Move down"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>

                    {/* Quantity badge */}
                    <div className="flex-shrink-0 min-w-[48px] h-7 rounded-md bg-[var(--background)] border border-[var(--border)] flex items-center justify-center px-2">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        {ing.cantidad || "—"}
                      </span>
                    </div>

                    {/* Description & category */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{ing.descripcion}</p>
                      {ing.categoria && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{ing.categoria}</p>
                      )}
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startEdit(i)}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-emerald-50 cursor-pointer"
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(i)}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {/* Insert line after last item */}
          {!isFormOpen && renderInsertLine(ingredients.length)}
          {insertAtIndex === ingredients.length && renderForm("insert")}
        </div>
      )}

      {/* Add button at bottom */}
      {!isFormOpen && (
        <button
          type="button"
          onClick={() => {
            setForm({ cantidad: "", categoria: "", descripcion: "" });
            setInsertAtIndex(null);
            setEditingIndex(null);
            // Use a special state for "add at end"
            setInsertAtIndex(ingredients.length);
          }}
          className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-emerald-50/30 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t("ingredients.add")}
        </button>
      )}
    </div>
  );
}
