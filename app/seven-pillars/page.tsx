"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";

export default function SevenPillarsPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("sevenPillars");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const sorted = [...data].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));

  const fields: FieldConfig[] = [
    { key: "key", label: t("sevenPillars.fields.key"), type: "text", required: true },
    { key: "label", label: t("sevenPillars.fields.label"), type: "text", required: true },
  ];

  const columns = [
    {
      key: "key",
      label: t("sevenPillars.fields.key"),
      render: (value: unknown) => (
        <span className="px-2.5 py-1 bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)] rounded-md text-xs font-mono">
          {String(value ?? "")}
        </span>
      ),
    },
    { key: "label", label: t("sevenPillars.fields.label") },
  ];

  return (
    <div>
      <PageHeader
        title={t("sevenPillars.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("sevenPillars.addLabel")}
      />
      <p className="text-[13px] text-[var(--text-muted)] mb-5">{t("sevenPillars.description")}</p>
      <DataTable
        columns={columns}
        data={sorted}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => { if (confirm(t("sevenPillars.confirmDelete"))) await remove(id); }}
      />
      <FormModal
        title={editing ? t("sevenPillars.editTitle") : t("sevenPillars.newTitle")}
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
