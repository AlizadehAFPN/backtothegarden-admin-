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

  // The mobile app filters recipes by `recipe.category === category.id`, so we
  // store the category document id and only display its name.
  const categoryOptions = useMemo(
    () =>
      categories
        .map((c) => ({ value: String(c.id), label: String(c.name ?? c.id) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [categories]
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(String(c.id), String(c.name ?? c.id)));
    return map;
  }, [categories]);

  const fields: FieldConfig[] = [
    { key: "name", label: t("recipes.fields.name"), type: "text", required: true },
    { key: "description", label: t("recipes.fields.description"), type: "textarea", required: true },
    { key: "image", label: t("recipes.fields.image"), type: "image-upload", required: true, storagePath: "recipes/images", uploadLabel: "Upload Image" },
    { key: "videoUrl", label: t("recipes.fields.videoUrl"), type: "file-upload", requiredOneOf: "videoSource", requiredOneOfLabel: t("recipes.videoSource"), storagePath: "recipes/videos", accept: "video/*", uploadLabel: "Upload Video" },
    { key: "url", label: t("recipes.fields.url"), type: "url", requiredOneOf: "videoSource" },
    { key: "category", label: t("recipes.fields.category"), type: "select", options: categoryOptions, required: true },
    { key: "ingredients", label: t("recipes.fields.ingredients"), type: "ingredients", required: true },
    { key: "steps", label: t("recipes.fields.steps"), type: "steps" },
    { key: "premium", label: t("recipes.fields.premium"), type: "checkbox" },
    { key: "createdAt", label: t("recipes.fields.createdAt"), type: "datetime" },
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
    {
      key: "category",
      label: t("recipes.fields.category"),
      render: (value: unknown) =>
        value ? categoryNameById.get(String(value)) ?? String(value) : "—",
    },
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
      key: "steps",
      label: t("recipes.fields.steps"),
      render: (value: unknown) => (
        <span className="text-[var(--text-muted)] text-xs">
          {Array.isArray(value) ? `${value.length} ${t("steps.items")}` : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: t("recipes.fields.createdAt"),
      render: (value: unknown) =>
        value && typeof value === "object" && "seconds" in value ? (
          new Date((value as { seconds: number }).seconds * 1000).toLocaleDateString()
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
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
        onDelete={async (id) => {
          if (!confirm(t("recipes.confirmDelete"))) return;
          try {
            await remove(id);
          } catch (err) {
            alert(`${t("form.deleteError")} ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
      />
      <FormModal
        title={editing ? t("recipes.editTitle") : t("recipes.newTitle")}
        fields={fields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (formData) => {
          // Drop blank steps but keep their order.
          if (Array.isArray(formData.steps)) {
            formData.steps = formData.steps
              .map((s) => String(s ?? ""))
              .filter((s) => s.trim() !== "");
          }
          // Empty createdAt: let the server default it on create / leave the
          // existing value untouched on edit, instead of writing "".
          if (formData.createdAt === "" || formData.createdAt == null) {
            delete formData.createdAt;
          }
          if (editing) await update(editing.id, formData);
          else await add(formData);
        }}
        initialData={editing}
      />
    </div>
  );
}
