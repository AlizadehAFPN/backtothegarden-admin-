"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";

export default function TiendaPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("Tienda");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const fields: FieldConfig[] = [
    { key: "name", label: t("tienda.fields.name"), type: "text", required: true },
    { key: "description", label: t("tienda.fields.description"), type: "textarea" },
    { key: "image", label: t("tienda.fields.image"), type: "image-url" },
    { key: "pdfURL", label: t("tienda.fields.pdfURL"), type: "url" },
    { key: "category", label: t("tienda.fields.category"), type: "text" },
    { key: "price", label: t("tienda.fields.price"), type: "text" },
    { key: "link", label: t("tienda.fields.link"), type: "url" },
    { key: "premium", label: t("tienda.fields.premium"), type: "checkbox" },
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
      key: "premium",
      label: t("tienda.fields.premium"),
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
        title={t("tienda.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("tienda.addLabel")}
      />
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => { if (confirm(t("tienda.confirmDelete"))) await remove(id); }}
      />
      <FormModal
        title={editing ? t("tienda.editTitle") : t("tienda.newTitle")}
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
