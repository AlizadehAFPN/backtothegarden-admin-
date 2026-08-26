"use client";

import { useMemo, useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import {
  LIVE_SECTIONS,
  LIVE_SESSIONS_COLLECTION,
  LiveSectionId,
  liveAudience,
  liveAudienceClass,
  liveSessionStatus,
  liveStatusClass,
  readLiveSession,
} from "@/lib/liveSessions";

interface EditingTarget {
  sectionId: LiveSectionId;
  /** Captured when the modal opens so live snapshots can't wipe in-progress edits. */
  doc: DocData | null;
}

export default function LiveSessionsPage() {
  const { t, locale } = useTranslation();
  const { data, loading, add, update } = useCollection(LIVE_SESSIONS_COLLECTION);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale]
  );

  // Memoised so a Firestore snapshot arriving while the modal is open does not
  // reset the form (FormModal re-seeds itself whenever `fields` changes identity).
  const fields: FieldConfig[] = useMemo(
    () => [
      { key: "enabled", label: t("liveSessions.fields.enabled"), type: "checkbox" },
      { key: "openToAll", label: t("liveSessions.fields.openToAll"), type: "checkbox" },
      { key: "buttonLabel", label: t("liveSessions.fields.buttonLabel"), type: "text" },
      { key: "liveUrl", label: t("liveSessions.fields.liveUrl"), type: "url" },
      { key: "liveFrom", label: t("liveSessions.fields.liveFrom"), type: "datetime" },
      { key: "title", label: t("liveSessions.fields.title"), type: "text" },
      { key: "message", label: t("liveSessions.fields.message"), type: "textarea" },
      {
        key: "image",
        label: t("liveSessions.fields.image"),
        type: "image-upload",
        storagePath: "liveSessions/images",
        uploadLabel: t("form.uploadImage"),
      },
    ],
    [t]
  );

  const docFor = (sectionId: string): DocData | undefined =>
    data.find((d) => d.id === sectionId);

  /** Save under the section's fixed document id — create it the first time. */
  const persist = async (
    sectionId: LiveSectionId,
    values: Record<string, unknown>
  ) => {
    if (docFor(sectionId)) await update(sectionId, values);
    else await add(values, { id: sectionId });
  };

  const toggleEnabled = async (sectionId: LiveSectionId, next: boolean) => {
    setError("");
    setTogglingId(sectionId);
    try {
      await persist(sectionId, { enabled: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <PageHeader title={t("liveSessions.title")} />

      <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
          {t("liveSessions.howItWorksTitle")}
        </h2>
        <ul className="mt-2 space-y-1.5 text-[13px] text-[var(--text-secondary)] list-disc pl-4">
          <li>{t("liveSessions.howItWorks1")}</li>
          <li>{t("liveSessions.howItWorks2")}</li>
          <li>{t("liveSessions.howItWorks3")}</li>
          <li>{t("liveSessions.howItWorks4")}</li>
        </ul>
      </div>

      {error && (
        <p className="mb-5 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {error}
        </p>
      )}

      <div className="grid gap-5 max-w-2xl">
        {LIVE_SECTIONS.map((section) => {
          const doc = docFor(section.id);
          const s = readLiveSession(doc);
          const status = liveSessionStatus(s);
          const audience = liveAudience(s);
          const configured = doc !== undefined;

          return (
            <div
              key={section.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg leading-none">{section.icon}</span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
                      {t(section.labelKey)}
                    </h3>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                      {t("liveSessions.screenHint")}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${liveStatusClass(
                      status
                    )}`}
                  >
                    {status === "live" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                    {t(`liveSessions.status.${status}`)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${liveAudienceClass(
                      audience
                    )}`}
                  >
                    {audience === "premiumOnly" && <span aria-hidden="true">🔒</span>}
                    {t(`liveSessions.audience.${audience}`)}
                  </span>
                </div>
              </div>

              {/* Quick on/off — the toggle the team flips between sessions. */}
              <label className="mx-5 mt-4 flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 cursor-pointer select-none">
                <span className="text-[13px] font-medium text-[var(--text-primary)]">
                  {t("liveSessions.fields.enabled")}
                </span>
                <span className="relative inline-flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    disabled={loading || togglingId === section.id}
                    onChange={(e) => toggleEnabled(section.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--border)] rounded-full peer peer-checked:bg-[var(--accent)] peer-disabled:opacity-50 transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:shadow-sm after:transition-all peer-checked:after:translate-x-5" />
                </span>
              </label>

              <dl className="px-5 py-4 space-y-3 text-[13px] flex-1">
                <div>
                  <dt className="text-[var(--text-muted)] text-[12px]">
                    {t("liveSessions.fields.liveUrl")}
                  </dt>
                  <dd className="mt-0.5 text-[var(--text-primary)] break-all">
                    {s.liveUrl ? (
                      <a
                        href={s.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)] hover:underline"
                      >
                        {s.liveUrl}
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">
                        {t("liveSessions.noLiveUrl")}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)] text-[12px]">
                    {t("liveSessions.fields.liveFrom")}
                  </dt>
                  <dd className="mt-0.5 text-[var(--text-primary)]">
                    {s.liveFrom ? (
                      dateFormatter.format(s.liveFrom)
                    ) : (
                      <span className="text-[var(--text-muted)]">
                        {t("liveSessions.liveFromEmpty")}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)] text-[12px]">
                    {t("liveSessions.fields.openToAll")}
                  </dt>
                  <dd className="mt-0.5 text-[var(--text-primary)]">
                    {s.openToAll
                      ? t("liveSessions.audienceEveryoneHint")
                      : t("liveSessions.audiencePremiumHint")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)] text-[12px]">
                    {t("liveSessions.appPreview")}
                  </dt>
                  <dd className="mt-1.5">
                    {status === "off" ? (
                      <p className="text-[var(--text-muted)]">
                        {t("liveSessions.previewOff")}
                      </p>
                    ) : status === "live" ? (
                      <p className="text-[var(--text-secondary)]">
                        {t("liveSessions.previewLive")}
                      </p>
                    ) : (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 flex gap-3">
                        {s.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.image}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover border border-[var(--border)] shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">
                            {s.title || t("liveSessions.previewNoTitle")}
                          </p>
                          <p className="text-[var(--text-secondary)] mt-0.5 line-clamp-3">
                            {s.message || t("liveSessions.previewNoMessage")}
                          </p>
                        </div>
                      </div>
                    )}
                  </dd>
                </div>
              </dl>

              <div className="px-5 pb-5">
                <button
                  onClick={() => setEditing({ sectionId: section.id, doc: doc ?? null })}
                  className="w-full px-4 py-2.5 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] cursor-pointer shadow-[var(--shadow-sm)]"
                >
                  {configured ? t("liveSessions.edit") : t("liveSessions.configure")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <FormModal
        title={
          editing
            ? `${t("liveSessions.editTitle")} — ${t(
                LIVE_SECTIONS.find((x) => x.id === editing.sectionId)!.labelKey
              )}`
            : t("liveSessions.editTitle")
        }
        fields={fields}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSubmit={async (formData) => {
          if (!editing) return;
          await persist(editing.sectionId, formData);
        }}
        initialData={editing?.doc ?? null}
      />
    </div>
  );
}
