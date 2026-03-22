"use client";

import { useMemo, useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";

export default function MasterClassesPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("MasterClasses");
  const { data: pillars } = useCollection("sevenPillars");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const categoryOptions = useMemo(() => {
    const fromPillars = pillars.map((p) => ({
      value: String(p.key ?? p.id),
      label: String(p.label ?? p.key ?? p.id),
    }));
    // Also include any categories from existing data not in pillars
    const pillarKeys = new Set(fromPillars.map((p) => p.value));
    data.forEach((item) => {
      if (item.category && typeof item.category === "string" && !pillarKeys.has(item.category)) {
        fromPillars.push({ value: item.category, label: item.category });
        pillarKeys.add(item.category);
      }
    });
    return fromPillars.sort((a, b) => a.label.localeCompare(b.label));
  }, [data, pillars]);

  const fields: FieldConfig[] = [
    { key: "name", label: t("masterClasses.fields.name"), type: "text", required: true },
    { key: "description", label: t("masterClasses.fields.description"), type: "textarea" },
    { key: "video", label: t("masterClasses.fields.video"), type: "url" },
    { key: "url", label: t("masterClasses.fields.url"), type: "url" },
    { key: "image", label: t("masterClasses.fields.image"), type: "image-url" },
    { key: "category", label: t("masterClasses.fields.category"), type: "select", options: categoryOptions },
    { key: "time", label: t("masterClasses.fields.time"), type: "text" },
    { key: "dateAdded", label: t("masterClasses.fields.dateAdded"), type: "datetime" },
    { key: "premium", label: t("masterClasses.fields.premium"), type: "checkbox" },
  ];

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
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => { if (confirm(t("masterClasses.confirmDelete"))) await remove(id); }}
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
