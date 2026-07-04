"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import { useTableSearch } from "@/lib/useTableSearch";

export default function GuiasPDFPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("GuiasPDF");
  const { search, setSearch, filtered } = useTableSearch(data, "name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const fields: FieldConfig[] = [
    { key: "name", label: t("guiasPdf.fields.name"), type: "text", required: true },
    { key: "description", label: t("guiasPdf.fields.description"), type: "textarea", required: true },
    { key: "image", label: t("guiasPdf.fields.image"), type: "image-upload", required: true, storagePath: "guiaspdf/images", uploadLabel: "Upload Image" },
    { key: "pdfURL", label: t("guiasPdf.fields.pdfURL"), type: "url", required: true },
    { key: "category", label: t("guiasPdf.fields.category"), type: "text", required: true },
  ];

  const columns = [
    {
      key: "image",
      label: t("guiasPdf.fields.image"),
      render: (value: unknown) =>
        value ? (
          <img src={String(value)} alt="" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    { key: "name", label: t("guiasPdf.fields.name") },
    { key: "category", label: t("guiasPdf.fields.category") },
  ];

  return (
    <div>
      <PageHeader
        title={t("guiasPdf.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("guiasPdf.addLabel")}
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
          if (!confirm(t("guiasPdf.confirmDelete"))) return;
          try {
            await remove(id);
          } catch (err) {
            alert(`${t("form.deleteError")} ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
      />
      <FormModal
        title={editing ? t("guiasPdf.editTitle") : t("guiasPdf.newTitle")}
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
