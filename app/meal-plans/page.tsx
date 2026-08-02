"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import { useTableSearch } from "@/lib/useTableSearch";
import { getYoutubeThumbnail } from "@/lib/youtube";

export default function MealPlansPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("MealPlans");
  const { search, setSearch, filtered } = useTableSearch(data, "name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const fields: FieldConfig[] = [
    { key: "name", label: t("mealPlans.fields.name"), type: "text", required: true },
    { key: "description", label: t("mealPlans.fields.description"), type: "textarea", required: true },
    // Cover: either an uploaded image or a YouTube link — the app renders a
    // player instead of a still when the link is the one that's filled in.
    { key: "image", label: t("mealPlans.fields.image"), type: "image-upload", requiredOneOf: "cover", requiredOneOfLabel: t("mealPlans.coverSource"), oneOfRequired: true, storagePath: "mealplans/images", uploadLabel: t("form.uploadImage") },
    { key: "url", label: t("mealPlans.fields.url"), type: "youtube-url", requiredOneOf: "cover" },
    { key: "dateAdded", label: t("mealPlans.fields.dateAdded"), type: "datetime" },
    { key: "premium", label: t("mealPlans.fields.premium"), type: "checkbox" },
    { key: "available", label: t("mealPlans.fields.available"), type: "checkbox", defaultChecked: true },
    { key: "days", label: t("mealPlans.fields.days"), type: "days", storagePath: "mealplans/days" },
  ];

  const columns = [
    {
      key: "image",
      label: t("mealPlans.fields.image"),
      render: (value: unknown, row: DocData) => {
        const youtubeThumb = value ? null : getYoutubeThumbnail(row.url);
        const src = value ? String(value) : youtubeThumb;
        if (!src) return <span className="text-[var(--text-muted)]">—</span>;
        return (
          <div className="relative w-10 h-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
            {youtubeThumb && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-black/60">
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="white">
                    <polygon points="6 4 20 12 6 20" />
                  </svg>
                </span>
              </span>
            )}
          </div>
        );
      },
    },
    { key: "name", label: t("mealPlans.fields.name") },
    {
      key: "days",
      label: t("common.days"),
      render: (value: unknown) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {Array.isArray(value) ? value.length : 0} {t("common.days")}
        </span>
      ),
    },
    {
      key: "premium",
      label: t("mealPlans.fields.premium"),
      render: (value: unknown) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
          }`}
        >
          {value ? t("common.premium") : t("common.free")}
        </span>
      ),
    },
    {
      key: "available",
      label: t("mealPlans.fields.available"),
      render: (value: unknown) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value !== false ? t("common.available") : t("common.unavailable")}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("mealPlans.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("mealPlans.addLabel")}
      />
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("common.searchByName")}
        resultCount={filtered.length}
        totalCount={data.length}
      />
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => {
          if (!confirm(t("mealPlans.confirmDelete"))) return;
          try {
            await remove(id);
          } catch (err) {
            alert(`${t("form.deleteError")} ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
      />
      <FormModal
        title={editing ? t("mealPlans.editTitle") : t("mealPlans.newTitle")}
        fields={fields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (formData) => {
          if (editing) await update(editing.id, formData);
          else await add(formData);
        }}
        initialData={editing}
      />
    </div>
  );
}
