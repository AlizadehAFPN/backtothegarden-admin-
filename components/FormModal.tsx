"use client";

import { useState, useEffect, Fragment } from "react";
import { DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import IngredientsEditor from "./IngredientsEditor";
import DaysEditor, { normalizeDays, PlanDay } from "./DaysEditor";
import FileUploader from "./FileUploader";
import ImageUploader from "./ImageUploader";
import Dropdown from "./Dropdown";

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "checkbox" | "select" | "image-url" | "image-upload" | "url" | "datetime" | "json" | "ingredients" | "days" | "file-upload";
  options?: { value: string; label: string }[];
  required?: boolean;
  /** Render the field as read-only (shown but not editable). */
  disabled?: boolean;
  /** Fields sharing the same group id require at least one to be filled in. */
  requiredOneOf?: string;
  /** Heading shown above a requiredOneOf group (set on any one field in the group). */
  requiredOneOfLabel?: string;
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    setErrors({});
    setFormError("");
    if (initialData) {
      const data = { ...initialData };
      fields.forEach((f) => {
        if (f.type === "datetime") {
          data[f.key] = timestampToDatetimeLocal(data[f.key]);
        }
        if (f.type === "json") {
          data[f.key] = jsonToString(data[f.key]);
        }
        if (f.type === "ingredients") {
          const v = data[f.key];
          if (typeof v === "string" && v.trim()) {
            try {
              data[f.key] = JSON.parse(v);
            } catch {
              data[f.key] = [];
            }
          } else if (!Array.isArray(v)) {
            data[f.key] = [];
          }
        }
        if (f.type === "days") {
          data[f.key] = normalizeDays(data[f.key]);
        }
      });
      setFormData(data);
    } else {
      const defaults: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (f.type === "checkbox") defaults[f.key] = false;
        else if (f.type === "ingredients" || f.type === "days") defaults[f.key] = [];
        else defaults[f.key] = "";
      });
      setFormData(defaults);
    }
  }, [initialData, open, fields]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Native HTML validation already covers text/textarea/datetime/url/
    // image-url/number inputs. select (custom Dropdown), file-upload and
    // ingredients render custom widgets with no native `required`, so enforce
    // them manually here.
    const validationErrors: Record<string, string> = {};
    fields.forEach((f) => {
      if (!f.required) return;
      const value = formData[f.key];
      if (f.type === "file-upload" || f.type === "image-upload" || f.type === "select") {
        if (typeof value !== "string" || value.trim() === "") {
          validationErrors[f.key] = t("form.required");
        }
      } else if (f.type === "ingredients") {
        if (!Array.isArray(value) || value.length === 0) {
          validationErrors[f.key] = t("form.required");
        }
      }
    });
    // "At least one of" groups: every field sharing a requiredOneOf id must
    // have at least one non-empty value between them.
    const oneOfGroups: Record<string, FieldConfig[]> = {};
    fields.forEach((f) => {
      if (f.requiredOneOf) (oneOfGroups[f.requiredOneOf] ??= []).push(f);
    });
    Object.values(oneOfGroups).forEach((groupFields) => {
      const anyFilled = groupFields.some((f) => {
        const value = formData[f.key];
        return typeof value === "string" && value.trim() !== "";
      });
      if (!anyFilled) {
        groupFields.forEach((f) => {
          validationErrors[f.key] = t("form.requiredOneOf");
        });
      }
    });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setFormError("");

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
        if (f.type === "days") {
          const days = normalizeDays(submitData[f.key]);
          // Recipe ids -> reference markers the API converts to DocumentReferences.
          submitData[f.key] = days.map((d: PlanDay) => ({
            name: d.name,
            dayNumber: d.dayNumber,
            image: d.image,
            recipes: d.recipes.map((id) => ({ __ref: `Recetas/${id}` })),
          }));
        }
      });
      await onSubmit(submitData);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-[var(--border)] bg-[var(--surface)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition";

  const renderField = (field: FieldConfig, opts?: { inGroup?: boolean }) => (
    <div key={field.key}>
      <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
        {field.label}
        {!opts?.inGroup && (field.required || field.requiredOneOf) && (
          <span className="text-red-400 ml-0.5">*</span>
        )}
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
      ) : field.type === "image-upload" ? (
        <ImageUploader
          value={String(formData[field.key] ?? "")}
          onChange={(url) => setFormData((prev) => ({ ...prev, [field.key]: url }))}
          storagePath={field.storagePath}
          label={field.uploadLabel}
        />
      ) : field.type === "ingredients" ? (
        <IngredientsEditor
          value={formData[field.key]}
          onChange={(val) =>
            setFormData((prev) => ({ ...prev, [field.key]: val }))
          }
        />
      ) : field.type === "days" ? (
        <DaysEditor
          value={formData[field.key]}
          onChange={(val) =>
            setFormData((prev) => ({ ...prev, [field.key]: val }))
          }
          storagePath={field.storagePath}
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
        <Dropdown
          options={field.options ?? []}
          value={String(formData[field.key] ?? "")}
          onChange={(val) =>
            setFormData({ ...formData, [field.key]: val })
          }
          placeholder={t("form.select")}
          ariaLabel={field.label}
          className="w-full"
        />
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
          disabled={field.disabled}
          className={`${inputClass} ${field.disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        />
      )}
      {!opts?.inGroup && errors[field.key] && (
        <p className="mt-1.5 text-[12px] text-red-500">{errors[field.key]}</p>
      )}
    </div>
  );

  // Render fields top-to-bottom, but collapse consecutive fields that share a
  // `requiredOneOf` id into a single "choose one" box with an OR divider.
  const renderedFields: React.ReactNode[] = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field.requiredOneOf) {
      renderedFields.push(renderField(field));
      continue;
    }
    const groupId = field.requiredOneOf;
    const group: FieldConfig[] = [];
    while (i < fields.length && fields[i].requiredOneOf === groupId) {
      group.push(fields[i]);
      i++;
    }
    i--; // step back; the for-loop will advance past the last grouped field
    const groupTitle = group.find((f) => f.requiredOneOfLabel)?.requiredOneOfLabel;
    const groupError = group.map((f) => errors[f.key]).find(Boolean);
    renderedFields.push(
      <div
        key={`group-${groupId}`}
        className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            {groupTitle ?? t("form.chooseOneTitle")}
          </span>
          <span className="text-red-400">*</span>
        </div>
        <p className="text-[12px] text-[var(--text-muted)] mt-0.5 mb-3">
          {t("form.chooseOneHint")}
        </p>
        <div className="space-y-1">
          {group.map((f, idx) => (
            <Fragment key={f.key}>
              {idx > 0 && (
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-[var(--border)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {t("form.or")}
                  </span>
                  <div className="h-px flex-1 bg-[var(--border)]" />
                </div>
              )}
              {renderField(f, { inGroup: true })}
            </Fragment>
          ))}
        </div>
        {groupError && (
          <p className="mt-2.5 text-[12px] text-red-500">{groupError}</p>
        )}
      </div>
    );
  }

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
          {renderedFields}

          {formError && (
            <p className="text-[13px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {formError}
            </p>
          )}

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
