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

  const generalFields: FieldConfig[] = [
    { key: "name", label: t("categories.fields.name"), type: "text", required: true },
  ];

  const recipeFields: FieldConfig[] = [
    { key: "name", label: t("categories.fields.name"), type: "text", required: true },
    { key: "label", label: t("categories.fields.label"), type: "text" },
  ];

  const generalColumns = [{ key: "name", label: t("categories.fields.name") }];
  const recipeColumns = [
    { key: "name", label: t("categories.fields.name") },
    { key: "label", label: t("categories.fields.label") },
  ];

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
        columns={isGeneral ? generalColumns : recipeColumns}
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
        fields={isGeneral ? generalFields : recipeFields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (formData) => {
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
