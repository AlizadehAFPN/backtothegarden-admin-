"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import { useTableSearch } from "@/lib/useTableSearch";
import { saveDateOrdered } from "@/lib/dateOrderedDocs";

export default function TiendaPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("Tienda");
  const { search, setSearch, filtered } = useTableSearch(data, "name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const fields: FieldConfig[] = [
    { key: "name", label: t("tienda.fields.name"), type: "text", required: true },
    { key: "description", label: t("tienda.fields.description"), type: "textarea", required: true },
    { key: "image", label: t("tienda.fields.image"), type: "image-upload", required: true, storagePath: "tienda/images", uploadLabel: t("form.uploadImage") },
    { key: "pdfURL", label: t("tienda.fields.pdfURL"), type: "url" },
    { key: "category", label: t("tienda.fields.category"), type: "text", required: true },
    { key: "price", label: t("tienda.fields.price"), type: "text", required: true },
    { key: "link", label: t("tienda.fields.link"), type: "url" },
    { key: "createdAt", label: t("tienda.fields.createdAt"), type: "datetime" },
  ];

  const columns = [
    {
      key: "image",
      label: t("tienda.fields.image"),
      render: (value: unknown) =>
        value ? (
          <img src={String(value)} alt="" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    { key: "name", label: t("tienda.fields.name") },
    { key: "category", label: t("tienda.fields.category") },
    {
      key: "price",
      label: t("tienda.fields.price"),
      render: (value: unknown) =>
        value ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            {String(value)}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    {
      key: "createdAt",
      label: t("tienda.fields.createdAt"),
      render: (value: unknown) =>
        value && typeof value === "object" && "seconds" in value ? (
          new Date((value as { seconds: number }).seconds * 1000).toLocaleDateString()
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("tienda.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("tienda.addLabel")}
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
          if (!confirm(t("tienda.confirmDelete"))) return;
          try {
            await remove(id);
          } catch (err) {
            alert(`${t("form.deleteError")} ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
      />
      <FormModal
        title={editing ? t("tienda.editTitle") : t("tienda.newTitle")}
        fields={fields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(formData) =>
          // The app shows the store in document-id order, so the date has to
          // reach Firestore as part of the id.
          saveDateOrdered({
            formData,
            editing,
            add,
            update,
            dateKey: "createdAt",
            nameKey: "name",
          })
        }
        initialData={editing}
      />
    </div>
  );
}
