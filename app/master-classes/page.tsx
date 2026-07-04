"use client";

import { useMemo, useState } from "react";
import { selectOptionsFromSevenPillars } from "@/lib/sevenPillarCategoryOptions";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import { useTableSearch } from "@/lib/useTableSearch";

export default function MasterClassesPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("MasterClasses");
  const { data: pillars } = useCollection("sevenPillars");
  const { search, setSearch, filtered: nameFiltered } = useTableSearch(data, "name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");

  const categoryOptions = useMemo(
    () => selectOptionsFromSevenPillars(data, pillars),
    [data, pillars]
  );

  const fields: FieldConfig[] = [
    { key: "name", label: t("masterClasses.fields.name"), type: "text", required: true },
    { key: "description", label: t("masterClasses.fields.description"), type: "textarea", required: true },
    { key: "video", label: t("masterClasses.fields.video"), type: "file-upload", requiredOneOf: "videoSource", requiredOneOfLabel: t("masterClasses.videoSource"), oneOfRequired: true, storagePath: "masterclasses/videos", accept: "video/*", uploadLabel: "Upload Video", durationField: "time" },
    { key: "url", label: t("masterClasses.fields.url"), type: "url", requiredOneOf: "videoSource" },
    { key: "image", label: t("masterClasses.fields.image"), type: "image-upload", required: true, storagePath: "masterclasses/images", uploadLabel: "Upload Image" },
    { key: "category", label: t("masterClasses.fields.category"), type: "select", options: categoryOptions, required: true },
    { key: "time", label: t("masterClasses.fields.time"), type: "text" },
    { key: "dateAdded", label: t("masterClasses.fields.dateAdded"), type: "datetime" },
    { key: "premium", label: t("masterClasses.fields.premium"), type: "checkbox" },
  ];

  const filteredData = useMemo(
    () =>
      categoryFilter
        ? nameFiltered.filter((item) => item.category === categoryFilter)
        : nameFiltered,
    [nameFiltered, categoryFilter]
  );

  const columns = [
    {
      key: "image",
      label: t("masterClasses.fields.image"),
      render: (value: unknown) =>
        value ? (
          <img src={String(value)} alt="" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    { key: "name", label: t("masterClasses.fields.name") },
    { key: "category", label: t("masterClasses.fields.category") },
    { key: "time", label: t("common.time") },
    {
      key: "premium",
      label: t("masterClasses.fields.premium"),
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
  ];

  return (
    <div>
      <PageHeader
        title={t("masterClasses.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("masterClasses.addLabel")}
      />
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("masterClasses.searchPlaceholder")}
        filters={[
          {
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions,
            allLabel: t("masterClasses.allCategories"),
          },
        ]}
        resultCount={filteredData.length}
        totalCount={data.length}
      />
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => {
          if (!confirm(t("masterClasses.confirmDelete"))) return;
          try {
            await remove(id);
          } catch (err) {
            alert(`${t("form.deleteError")} ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
      />
      <FormModal
        title={editing ? t("masterClasses.editTitle") : t("masterClasses.newTitle")}
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
