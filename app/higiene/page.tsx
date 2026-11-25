"use client";

import { useCollection } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import { useTableSearch } from "@/lib/useTableSearch";
import { useFormModal } from "@/lib/useFormModal";
import { formTitleKey } from "@/lib/formValues";

const HIGIENE_CATEGORIES = [{ value: "jabon", label: "Jabón" }];

export default function HigienePage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("Higiene");
  const { search, setSearch, filtered } = useTableSearch(data, "name");
  const modal = useFormModal();

  const fields: FieldConfig[] = [
    { key: "name", label: t("higiene.fields.name"), type: "text", required: true },
    { key: "description", label: t("higiene.fields.description"), type: "textarea", required: true },
    { key: "image", label: t("higiene.fields.image"), type: "image-upload", required: true, storagePath: "higiene/images", uploadLabel: t("form.uploadImage") },
    { key: "videoUrl", label: t("higiene.fields.videoUrl"), type: "file-upload", requiredOneOf: "videoSource", requiredOneOfLabel: t("higiene.videoSource"), storagePath: "higiene/videos", accept: "video/*", uploadLabel: t("form.uploadVideo") },
    { key: "url", label: t("higiene.fields.url"), type: "youtube-url", requiredOneOf: "videoSource" },
    { key: "category", label: t("higiene.fields.category"), type: "select", options: HIGIENE_CATEGORIES, required: true },
    { key: "premium", label: t("higiene.fields.premium"), type: "checkbox" },
  ];

  const columns = [
    {
      key: "image",
      label: t("higiene.fields.image"),
      render: (value: unknown) =>
        value ? (
          <img src={String(value)} alt="" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    { key: "name", label: t("higiene.fields.name") },
    { key: "category", label: t("higiene.fields.category") },
    {
      key: "premium",
      label: t("higiene.fields.premium"),
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
        title={t("higiene.title")}
        count={data.length}
        onAdd={modal.openCreate}
        addLabel={t("higiene.addLabel")}
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
        onEdit={modal.openEdit}
        onDuplicate={modal.openDuplicate}
        onDelete={async (id) => {
          if (!confirm(t("higiene.confirmDelete"))) return;
          try {
            await remove(id);
          } catch (err) {
            alert(`${t("form.deleteError")} ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
      />
      <FormModal
        title={t(formTitleKey("higiene", modal.mode))}
        fields={fields}
        open={modal.open}
        onClose={modal.close}
        onSubmit={async (formData) => {
          if (modal.editing) await update(modal.editing.id, formData);
          else await add(formData);
        }}
        initialData={modal.record}
        mode={modal.mode}
      />
    </div>
  );
}
