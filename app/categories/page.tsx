"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";

export default function CategoriesPage() {
  const { t } = useTranslation();
  const {
    data: categories,
    loading: l1,
    add: addCat,
    update: updateCat,
    remove: removeCat,
  } = useCollection("categories");
  const {
    data: recipeCategories,
    loading: l2,
    add: addRecCat,
    update: updateRecCat,
    remove: removeRecCat,
  } = useCollection("recipeCategories");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "recipe">("general");

  const isGeneral = activeTab === "general";
  const data = isGeneral ? categories : recipeCategories;
  const loading = l1 || l2;

  // Single user-facing field for both tabs, but persisted under the field each
  // collection already uses: general categories store `name`, recipe categories
  // store `label`. The UI looks identical; only the saved key differs.
  const nameKey = isGeneral ? "name" : "label";
  const nameLabel = t("categories.fields.name");

  const fields: FieldConfig[] = [
    { key: nameKey, label: nameLabel, type: "text", required: true },
  ];

  const columns = [{ key: nameKey, label: nameLabel }];

  return (
    <div>
      <PageHeader
        title={t("categories.title")}
        count={data.length}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        addLabel={t("categories.addLabel")}
      />

      <div className="flex gap-1 mb-5 p-1 bg-[var(--background)] rounded-xl border border-[var(--border)] w-fit">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition ${
            isGeneral
              ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {t("categories.generalTab")} <span className="ml-1 text-[11px] opacity-60">({categories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("recipe")}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition ${
            !isGeneral
              ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {t("categories.recipeTab")} <span className="ml-1 text-[11px] opacity-60">({recipeCategories.length})</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => {
          if (confirm(t("categories.confirmDelete"))) {
            if (isGeneral) await removeCat(id);
            else await removeRecCat(id);
          }
        }}
      />
      <FormModal
        title={editing ? t("categories.editTitle") : t("categories.newTitle")}
        fields={fields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (formData) => {
          const name = String(formData[nameKey] ?? "").trim().toLowerCase();
          const duplicate = data.some(
            (c) =>
              c.id !== editing?.id &&
              String(c[nameKey] ?? "").trim().toLowerCase() === name
          );
          if (duplicate) {
            throw new Error(t("categories.duplicateName"));
          }
          if (editing) {
            if (isGeneral) await updateCat(editing.id, formData);
            else await updateRecCat(editing.id, formData);
          } else {
            if (isGeneral) await addCat(formData);
            else await addRecCat(formData);
          }
        }}
        initialData={editing}
      />
    </div>
  );
}
