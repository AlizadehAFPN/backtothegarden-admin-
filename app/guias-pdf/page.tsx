"use client";

import { useCallback, useMemo, useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import { useTableSearch } from "@/lib/useTableSearch";
import { fileKindFromUrl } from "@/lib/fileUrl";
import { saveDateOrdered } from "@/lib/dateOrderedDocs";
import {
  extraCategoryKeys,
  guiasPdfCategoryLabel,
  guiasPdfCategoryOptions,
  type GuiasPdfCategory,
} from "@/lib/guiasPdfCategories";

export default function GuiasPDFPage() {
  const { t } = useTranslation();
  const { data, loading, add, update, remove } = useCollection("GuiasPDF");
  const { search, setSearch, filtered } = useTableSearch(data, "name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const categoryLabel = useCallback(
    (category: GuiasPdfCategory) => t(`guiasPdf.categories.${category}`),
    [t]
  );

  // Collapsed to a string first: every Firestore snapshot hands back a new
  // `data` array, and rebuilding `fields` while the modal is open would reset
  // whatever the admin is typing.
  const extraKeys = useMemo(() => extraCategoryKeys(data).join("|"), [data]);
  const categoryOptions = useMemo(
    () => guiasPdfCategoryOptions(extraKeys ? extraKeys.split("|") : [], categoryLabel),
    [extraKeys, categoryLabel]
  );

  // Category comes first: it decides which tab the guide shows up under in the
  // app, and the uploads below stay locked until it is set.
  const fields: FieldConfig[] = useMemo(
    () => [
      {
        key: "category",
        label: t("guiasPdf.fields.category"),
        type: "select",
        options: categoryOptions,
        required: true,
      },
      { key: "name", label: t("guiasPdf.fields.name"), type: "text", required: true },
      { key: "description", label: t("guiasPdf.fields.description"), type: "textarea", required: true },
      {
        key: "image",
        label: t("guiasPdf.fields.image"),
        type: "image-upload",
        required: true,
        dependsOn: "category",
        storagePath: "guiaspdf/images",
        uploadLabel: t("form.uploadImage"),
      },
      {
        key: "pdfURL",
        label: t("guiasPdf.fields.pdfURL"),
        type: "pdf-upload",
        required: true,
        dependsOn: "category",
        storagePath: "guiaspdf/pdfs",
        uploadLabel: t("form.uploadPdf"),
      },
      { key: "createdAt", label: t("guiasPdf.fields.createdAt"), type: "datetime" },
    ],
    [categoryOptions, t]
  );

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
    {
      key: "category",
      label: t("guiasPdf.fields.category"),
      render: (value: unknown) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent-subtle)] text-[var(--accent)] w-fit">
          {guiasPdfCategoryLabel(String(value ?? ""), categoryLabel)}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: t("guiasPdf.fields.createdAt"),
      render: (value: unknown) =>
        value && typeof value === "object" && "seconds" in value ? (
          new Date((value as { seconds: number }).seconds * 1000).toLocaleDateString()
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    {
      key: "pdfURL",
      label: t("guiasPdf.fields.pdfURL"),
      render: (value: unknown) => {
        const url = String(value ?? "");
        if (!url) return <span className="text-[var(--text-muted)]">—</span>;
        // The app downloads this file as a .pdf whatever it really is, so an
        // image sitting here is broken for users and worth calling out.
        const wrongFileType = fileKindFromUrl(url) === "other";
        return (
          <div className="flex items-center gap-1.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              {t("form.viewPdf")}
            </a>
            {wrongFileType && (
              <span title={t("form.notAPdf")} className="text-amber-500 inline-flex">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
            )}
          </div>
        );
      },
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
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("common.searchByName")}
        resultCount={filtered.length}
        totalCount={data.length}
      />
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={async (id) => {
          if (!confirm(t("guiasPdf.confirmDelete"))) return;
          try {
            await remove(id);
          } catch (err) {
            alert(`${t("form.deleteError")} ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
      />
      <FormModal
        title={editing ? t("guiasPdf.editTitle") : t("guiasPdf.newTitle")}
        fields={fields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(formData) =>
          // The app shows these guides in document-id order, so the date has to
          // reach Firestore as part of the id.
          saveDateOrdered({
            formData,
            editing,
            add,
            update,
            dateKey: "createdAt",
            nameKey: "name",
          })
        }
        initialData={editing}
      />
    </div>
  );
}
