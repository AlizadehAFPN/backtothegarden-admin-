"use client";

import { useState } from "react";
import { useCollection, DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FormModal, { FieldConfig } from "@/components/FormModal";
import UserAvatar from "@/components/UserAvatar";

export default function UsersPage() {
  const { t } = useTranslation();
  const { data, loading, update } = useCollection("Users");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  const fields: FieldConfig[] = [
    { key: "user_names", label: t("users.fields.name"), type: "text" },
    { key: "user_email", label: t("users.fields.email"), type: "text" },
    {
      key: "user_type",
      label: t("users.fields.type"),
      type: "select",
      options: [
        { value: "free", label: t("users.types.free") },
        { value: "basic", label: t("users.types.basic") },
        { value: "premium", label: t("users.types.premium") },
      ],
    },
    { key: "user_isMembresy", label: t("users.fields.membership"), type: "checkbox" },
    {
      key: "user_genre",
      label: t("users.fields.genre"),
      type: "select",
      options: [
        { value: "Masculino", label: t("users.fields.male") },
        { value: "Femenino", label: t("users.fields.female") },
      ],
    },
  ];

  const columns = [
    {
      key: "user_image",
      label: t("users.columns.photo"),
      render: (value: unknown) => <UserAvatar src={value} />,
    },
    { key: "user_names", label: t("users.columns.name") },
    { key: "user_email", label: t("users.columns.email") },
    {
      key: "user_type",
      label: t("users.columns.type"),
      render: (value: unknown) => {
        const colors: Record<string, string> = {
          free: "bg-slate-100 text-slate-700 border border-slate-200",
          basic: "bg-sky-50 text-sky-700 border border-sky-200",
          premium: "bg-amber-50 text-amber-700 border border-amber-200",
        };
        const v = String(value ?? "free");
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[v] ?? colors.free}`}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </span>
        );
      },
    },
    {
      key: "user_isMembresy",
      label: t("users.columns.membership"),
      render: (value: unknown) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value ? t("common.active") : t("common.inactive")}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">{t("users.title")}</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          {data.length} {t("users.registered")}
        </p>
      </div>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={() => {}}
      />
      <FormModal
        title={t("users.editTitle")}
        fields={fields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (formData) => {
          if (editing) {
            await update(editing.id, {
              user_type: formData.user_type,
              user_isMembresy: formData.user_isMembresy,
              user_genre: formData.user_genre,
              user_names: formData.user_names,
            });
          }
        }}
        initialData={editing}
      />
    </div>
  );
}
