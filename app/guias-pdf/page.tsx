"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";

export default function GuiasPDFPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("GuiasPDF");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const fields: FieldConfig[] = [
    { key: "name", label: t("guiasPdf.fields.name"), type: "text", required: true },
    { key: "description", label: t("guiasPdf.fields.description"), type: "textarea" },
    { key: "image", label: t("guiasPdf.fields.image"), type: "image-url" },
    { key: "pdfURL", label: t("guiasPdf.fields.pdfURL"), type: "url", required: true },
    { key: "category", label: t("guiasPdf.fields.category"), type: "text" },
    { key: "premium", label: t("guiasPdf.fields.premium"), type: "checkbox" },
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
    {
      key: "premium",
      label: t("guiasPdf.fields.premium"),
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
        title={t("guiasPdf.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("guiasPdf.addLabel")}
      />
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => { if (confirm(t("guiasPdf.confirmDelete"))) await remove(id); }}
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
