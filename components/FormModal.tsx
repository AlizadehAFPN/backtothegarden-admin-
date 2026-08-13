"use client";

import { useState, useEffect, Fragment } from "react";
import { DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import IngredientsEditor from "./IngredientsEditor";
import StepsEditor from "./StepsEditor";
import DateTimePicker from "./DateTimePicker";
import DaysEditor, { normalizeDays, PlanDay } from "./DaysEditor";
import FileUploader from "./FileUploader";
import ImageUploader from "./ImageUploader";
import PdfUploader from "./PdfUploader";
import YoutubeUrlInput from "./YoutubeUrlInput";
import Dropdown from "./Dropdown";
import { isYoutubeUrl } from "@/lib/youtube";

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "checkbox" | "select" | "image-url" | "image-upload" | "url" | "youtube-url" | "datetime" | "json" | "ingredients" | "steps" | "days" | "file-upload" | "pdf-upload";
  options?: { value: string; label: string }[];
  required?: boolean;
  /** Render the field as read-only (shown but not editable). */
  disabled?: boolean;
  /** Initial value for a checkbox field on a brand-new record (defaults to false). */
  defaultChecked?: boolean;
  /** Fields sharing the same group id are mutually exclusive (filling more than one is rejected). */
  requiredOneOf?: string;
  /** Heading shown above a requiredOneOf group (set on any one field in the group). */
  requiredOneOfLabel?: string;
  /** Set on any field in a requiredOneOf group to require that at least one of them be filled in. */
  oneOfRequired?: boolean;
  storagePath?: string;
  accept?: string;
  uploadLabel?: string;
  durationField?: string;
  /**
   * Key of another field that must be filled in first. Selects take their
   * options from `optionsByDependency`; upload fields simply stay disabled
   * until the parent has a value.
   */
  dependsOn?: string;
  /** Maps each parent field value to its own set of options (used together with dependsOn). */
  optionsByDependency?: Record<string, { value: string; label: string }[]>;
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
        if (f.type === "steps") {
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
        if (f.type === "checkbox" && data[f.key] === undefined) {
          data[f.key] = Boolean(f.defaultChecked);
        }
      });
      setFormData(data);
    } else {
      const defaults: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (f.type === "checkbox") defaults[f.key] = Boolean(f.defaultChecked);
        else if (f.type === "ingredients" || f.type === "steps" || f.type === "days") defaults[f.key] = [];
        else defaults[f.key] = "";
      });
      setFormData(defaults);
    }
  }, [initialData, open, fields]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Native HTML validation already covers text/textarea/datetime/url/
    // image-url/number inputs. select (custom Dropdown), the uploaders and
    // ingredients render custom widgets with no native `required`, so enforce
    // them manually here.
    const validationErrors: Record<string, string> = {};
    fields.forEach((f) => {
      if (!f.required) return;
      // Skip dependent selects whose parent field is empty (parent will show its own error).
      if (f.dependsOn && !formData[f.dependsOn]) return;
      const value = formData[f.key];
      if (
        f.type === "file-upload" ||
        f.type === "image-upload" ||
        f.type === "pdf-upload" ||
        f.type === "youtube-url" ||
        f.type === "select"
      ) {
        if (typeof value !== "string" || value.trim() === "") {
          validationErrors[f.key] = t("form.required");
        }
      } else if (f.type === "ingredients") {
        if (!Array.isArray(value) || value.length === 0) {
          validationErrors[f.key] = t("form.required");
        }
      }
    });
    // A filled-in YouTube field must be a link the mobile app can resolve to a
    // video id, otherwise the app has nothing to play.
    fields.forEach((f) => {
      if (f.type !== "youtube-url") return;
      const value = formData[f.key];
      if (typeof value !== "string" || value.trim() === "") return;
      if (!isYoutubeUrl(value.trim())) {
        validationErrors[f.key] = t("form.invalidYoutubeUrl");
      }
    });
    // "Choose one of" groups: fields sharing a requiredOneOf id are mutually
    // exclusive. If any field in the group is marked oneOfRequired, at least
    // one of them must be filled; regardless, filling more than one is
    // always rejected.
    const oneOfGroups: Record<string, FieldConfig[]> = {};
    fields.forEach((f) => {
      if (f.requiredOneOf) (oneOfGroups[f.requiredOneOf] ??= []).push(f);
    });
    Object.values(oneOfGroups).forEach((groupFields) => {
      const filledCount = groupFields.filter((f) => {
        const value = formData[f.key];
        return typeof value === "string" && value.trim() !== "";
      }).length;
      const isMandatory = groupFields.some((f) => f.oneOfRequired);
      if (isMandatory && filledCount === 0) {
        groupFields.forEach((f) => {
          validationErrors[f.key] = t("form.requiredOneOf");
        });
      } else if (filledCount > 1) {
        groupFields.forEach((f) => {
          validationErrors[f.key] = t("form.onlyOneOf");
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
        if (f.type === "youtube-url" && typeof submitData[f.key] === "string") {
          // A stray space would end up inside the video id the app parses out.
          submitData[f.key] = (submitData[f.key] as string).trim();
        }
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

  // Updates a field value and resets any dependent select, whose options come
  // from the parent value. Dependent uploads keep theirs: an already uploaded
  // file stays valid when the parent changes, and re-uploading it is expensive.
  const handleFieldChange = (key: string, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      fields.forEach((f) => {
        if (f.dependsOn === key && f.type === "select") next[f.key] = "";
      });
      return next;
    });
  };

  const renderField = (field: FieldConfig, opts?: { inGroup?: boolean }) => {
    const parentVal = field.dependsOn ? String(formData[field.dependsOn] ?? "") : "";
    const isDependentDisabled = Boolean(field.dependsOn) && !parentVal;
    const effectiveOptions = field.dependsOn
      ? (field.optionsByDependency?.[parentVal] ?? [])
      : (field.options ?? []);

    // Checkboxes render as a self-contained "settings row": label on the left,
    // toggle on the right, the whole row clickable. This reads better in a form
    // than the default label-above / control-below layout.
    if (field.type === "checkbox") {
      return (
        <label
          key={field.key}
          className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 cursor-pointer select-none hover:border-[var(--accent)] transition-colors"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {field.label}
          </span>
          <span className="relative inline-flex shrink-0 items-center">
            <input
              type="checkbox"
              checked={Boolean(formData[field.key])}
              onChange={(e) =>
                setFormData({ ...formData, [field.key]: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--border)] rounded-full peer peer-checked:bg-[var(--accent)] transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:shadow-sm after:transition-all peer-checked:after:translate-x-5" />
          </span>
        </label>
      );
    }

    return (
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
          disabled={isDependentDisabled}
        />
      ) : field.type === "pdf-upload" ? (
        <PdfUploader
          value={String(formData[field.key] ?? "")}
          onChange={(url) => setFormData((prev) => ({ ...prev, [field.key]: url }))}
          storagePath={field.storagePath}
          label={field.uploadLabel}
          disabled={isDependentDisabled}
        />
      ) : field.type === "youtube-url" ? (
        <YoutubeUrlInput
          value={String(formData[field.key] ?? "")}
          onChange={(url) => setFormData((prev) => ({ ...prev, [field.key]: url }))}
        />
      ) : field.type === "ingredients" ? (
        <IngredientsEditor
          value={formData[field.key]}
          onChange={(val) =>
            setFormData((prev) => ({ ...prev, [field.key]: val }))
          }
        />
      ) : field.type === "steps" ? (
        <StepsEditor
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
      ) : field.type === "select" ? (
        <Dropdown
          options={effectiveOptions}
          value={String(formData[field.key] ?? "")}
          onChange={(val) => handleFieldChange(field.key, val)}
          placeholder={isDependentDisabled ? t("form.selectParentFirst") : t("form.select")}
          disabled={isDependentDisabled}
          ariaLabel={field.label}
          className="w-full"
        />
      ) : field.type === "datetime" ? (
        <DateTimePicker
          value={String(formData[field.key] ?? "")}
          onChange={(val) =>
            setFormData((prev) => ({ ...prev, [field.key]: val }))
          }
          ariaLabel={field.label}
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
      {isDependentDisabled && (
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {t("form.selectParentFirstHint")}
        </p>
      )}
      {!opts?.inGroup && errors[field.key] && (
        <p className="mt-1.5 text-[12px] text-red-500">{errors[field.key]}</p>
      )}
    </div>
    );
  };

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
    const groupRequired = group.some((f) => f.oneOfRequired);
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
          {groupRequired && <span className="text-red-400">*</span>}
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
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-[var(--border)] shrink-0">
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
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="px-5 sm:px-6 py-5 space-y-5 overflow-y-auto flex-1">
            {renderedFields}

            {formError && (
              <p className="text-[13px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                {formError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--surface)]">
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
