"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";

export default function MealPlansPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("MealPlans");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const fields: FieldConfig[] = [
    { key: "name", label: t("mealPlans.fields.name"), type: "text", required: true },
    { key: "description", label: t("mealPlans.fields.description"), type: "textarea" },
    { key: "image", label: t("mealPlans.fields.image"), type: "image-url" },
    { key: "dateAdded", label: t("mealPlans.fields.dateAdded"), type: "datetime" },
    { key: "premium", label: t("mealPlans.fields.premium"), type: "checkbox" },
  ];

  const columns = [
    {
      key: "image",
      label: t("mealPlans.fields.image"),
      render: (value: unknown) =>
        value ? (
          <img src={String(value)} alt="" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
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
  ];

  return (
    <div>
      <PageHeader
        title={t("mealPlans.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("mealPlans.addLabel")}
      />
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => { if (confirm(t("mealPlans.confirmDelete"))) await remove(id); }}
      />
      <FormModal
        title={editing ? t("mealPlans.editTitle") : t("mealPlans.newTitle")}
        fields={fields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (formData) => {
          if (editing) await update(editing.id, formData);
          else await add({ ...formData, days: [] });
        }}
        initialData={editing}
      />
    </div>
  );
}
