"use client";

import { useState, useEffect } from "react";
import { DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import IngredientsEditor from "./IngredientsEditor";
import FileUploader from "./FileUploader";

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "checkbox" | "select" | "image-url" | "url" | "datetime" | "json" | "ingredients" | "file-upload";
  options?: { value: string; label: string }[];
  required?: boolean;
  storagePath?: string;
  accept?: string;
  uploadLabel?: string;
  durationField?: string;
}

interface FormModalProps {
  title: string;
  fields: FieldConfig[];
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  initialData?: DocData | null;
}

function timestampToDatetimeLocal(val: unknown): string {
  if (!val) return "";
  let date: Date;
  if (typeof val === "object" && val !== null && "seconds" in val) {
    date = new Date((val as { seconds: number }).seconds * 1000);
  } else if (typeof val === "string") {
    return val;
  } else {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function jsonToString(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

export default function FormModal({
  title,
  fields,
  open,
  onClose,
  onSubmit,
  initialData,
}: FormModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (initialData) {
      const data = { ...initialData };
      fields.forEach((f) => {
        if (f.type === "datetime") {
          data[f.key] = timestampToDatetimeLocal(data[f.key]);
        }
        if (f.type === "json") {
          data[f.key] = jsonToString(data[f.key]);
        }
      });
      setFormData(data);
    } else {
      const defaults: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (f.type === "checkbox") defaults[f.key] = false;
        else defaults[f.key] = "";
      });
      setFormData(defaults);
    }
  }, [initialData, open, fields]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const submitData = { ...formData };
      delete submitData.id;
      fields.forEach((f) => {
        if (f.type === "datetime" && submitData[f.key]) {
          submitData[f.key] = { __datetime: new Date(String(submitData[f.key])).toISOString() };
        }
        if (f.type === "json" && submitData[f.key]) {
          try {
            submitData[f.key] = JSON.parse(String(submitData[f.key]));
          } catch {
            // keep as string if invalid JSON
          }
        }
      });
      await onSubmit(submitData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-[var(--border)] bg-[var(--surface)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition";

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {field.type === "file-upload" ? (
                <FileUploader
                  value={String(formData[field.key] ?? "")}
                  onChange={(url) => setFormData((prev) => ({ ...prev, [field.key]: url }))}
                  onDurationDetected={field.durationField ? (dur) => setFormData((prev) => ({ ...prev, [field.durationField!]: dur })) : undefined}
                  storagePath={field.storagePath}
                  accept={field.accept}
                  label={field.uploadLabel}
                />
              ) : field.type === "ingredients" ? (
                <IngredientsEditor
                  value={formData[field.key] as { cantidad: string; categoria: string; descripcion: string }[]}
                  onChange={(val) => setFormData({ ...formData, [field.key]: val })}
                />
              ) : field.type === "textarea" ? (
                <textarea
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  required={field.required}
                  rows={3}
                  className={inputClass}
                />
              ) : field.type === "json" ? (
                <textarea
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  required={field.required}
                  rows={6}
                  className={`${inputClass} font-mono text-xs`}
                  placeholder='[{"descripcion": "1 taza de arroz"}]'
                />
              ) : field.type === "checkbox" ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData[field.key])}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.key]: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-[22px] bg-gray-200 rounded-full peer peer-checked:bg-[var(--accent)] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-[18px] after:shadow-sm" />
                </label>
              ) : field.type === "select" ? (
                <select
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  required={field.required}
                  className={inputClass}
                >
                  <option value="">{t("form.select")}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "datetime" ? (
                <input
                  type="datetime-local"
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  required={field.required}
                  className={inputClass}
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      [field.key]:
                        field.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                  required={field.required}
                  className={inputClass}
                />
              )}
            </div>
          ))}

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg cursor-pointer"
            >
              {t("form.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer shadow-[var(--shadow-sm)]"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("form.saving")}
                </span>
              ) : initialData ? t("form.update") : t("form.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
