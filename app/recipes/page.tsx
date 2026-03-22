"use client";

import { useMemo, useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";

export default function RecipesPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("Recetas");
  const { data: categories } = useCollection("categories");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const categoryOptions = useMemo(() => {
    const fromCategories = categories.map((c) => ({
      value: String(c.name ?? c.id),
      label: String(c.name ?? c.id),
    }));
    const catKeys = new Set(fromCategories.map((c) => c.value));
    data.forEach((item) => {
      if (item.category && typeof item.category === "string" && !catKeys.has(item.category)) {
        fromCategories.push({ value: item.category, label: item.category });
        catKeys.add(item.category);
      }
    });
    return fromCategories.sort((a, b) => a.label.localeCompare(b.label));
  }, [data, categories]);

  const fields: FieldConfig[] = [
    { key: "name", label: t("recipes.fields.name"), type: "text", required: true },
    { key: "description", label: t("recipes.fields.description"), type: "textarea" },
    { key: "image", label: t("recipes.fields.image"), type: "image-url" },
    { key: "videoUrl", label: t("recipes.fields.videoUrl"), type: "file-upload", storagePath: "recipes/videos", accept: "video/*", uploadLabel: "Upload Video" },
    { key: "category", label: t("recipes.fields.category"), type: "select", options: categoryOptions },
    { key: "ingredients", label: t("recipes.fields.ingredients"), type: "ingredients" },
    { key: "premium", label: t("recipes.fields.premium"), type: "checkbox" },
  ];

  const columns = [
    {
      key: "image",
      label: t("recipes.fields.image"),
      render: (value: unknown) =>
        value ? (
          <img src={String(value)} alt="" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    { key: "name", label: t("recipes.fields.name") },
    { key: "category", label: t("recipes.fields.category") },
    {
      key: "ingredients",
      label: t("recipes.fields.ingredients"),
      render: (value: unknown) => (
        <span className="text-[var(--text-muted)] text-xs">
          {Array.isArray(value) ? `${value.length} items` : "—"}
        </span>
      ),
    },
    {
      key: "premium",
      label: t("recipes.fields.premium"),
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
        title={t("recipes.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("recipes.addLabel")}
      />
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => { if (confirm(t("recipes.confirmDelete"))) await remove(id); }}
      />
      <FormModal
        title={editing ? t("recipes.editTitle") : t("recipes.newTitle")}
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
