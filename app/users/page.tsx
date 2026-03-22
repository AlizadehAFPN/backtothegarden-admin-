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
  const [search, setSearch] = useState("");

  const filteredData = search.trim()
    ? data.filter((user) =>
        String(user.user_email ?? "")
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      )
    : data;

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
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">{t("users.title")}</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            {data.length} {t("users.registered")}
          </p>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="pl-9 pr-3 py-2 text-[13px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent w-64"
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredData}
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
