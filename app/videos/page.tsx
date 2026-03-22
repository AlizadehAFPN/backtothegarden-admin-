"use client";

import { useMemo, useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";

export default function VideosPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("VideosExclusivos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((item) => {
      if (item.category && typeof item.category === "string") {
        unique.add(item.category);
      }
    });
    return [...unique].sort().map((cat) => ({ value: cat, label: cat }));
  }, [data]);

  const fields: FieldConfig[] = [
    { key: "name", label: t("videos.fields.name"), type: "text", required: true },
    { key: "description", label: t("videos.fields.description"), type: "textarea" },
    { key: "video", label: t("videos.fields.video"), type: "file-upload", required: true, storagePath: "videos", accept: "video/*", uploadLabel: "Upload Video", durationField: "time" },
    { key: "image", label: t("videos.fields.image"), type: "image-url" },
    { key: "category", label: t("videos.fields.category"), type: "select", options: categoryOptions },
    { key: "time", label: t("videos.fields.time"), type: "text" },
    { key: "dateAdded", label: t("videos.fields.dateAdded"), type: "datetime" },
    { key: "premium", label: t("videos.fields.premium"), type: "checkbox" },
  ];

  const columns = [
    {
      key: "image",
      label: t("videos.fields.image"),
      render: (value: unknown) =>
        value ? (
          <img src={String(value)} alt="" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    { key: "name", label: t("videos.fields.name") },
    { key: "category", label: t("videos.fields.category") },
    { key: "time", label: t("common.time") },
    {
      key: "premium",
      label: t("videos.fields.premium"),
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
        title={t("videos.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("videos.addLabel")}
      />
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => { if (confirm(t("videos.confirmDelete"))) await remove(id); }}
      />
      <FormModal
        title={editing ? t("videos.editTitle") : t("videos.newTitle")}
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
