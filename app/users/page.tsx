"use client";

import { useCallback, useEffect, useState } from "react";
import { DocData } from "@/lib/useCollection";
import { notifySessionExpired } from "@/lib/sessionExpiry";
import { useTranslation } from "@/i18n/LanguageContext";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import FormModal, { FieldConfig } from "@/components/FormModal";
import PageHeader from "@/components/PageHeader";
import UserAvatar from "@/components/UserAvatar";

const MIN_SEARCH_CHARS = 3;

interface UsersResponse {
  mode: "list" | "search";
  users: DocData[];
  nextCursor: string | null;
  capped: boolean;
  total?: number;
  error?: string;
}

async function fetchUsers(params: URLSearchParams): Promise<UsersResponse> {
  const res = await fetch(`/api/users?${params.toString()}`);
  if (res.status === 401) notifySessionExpired();
  const body = (await res.json().catch(() => ({}))) as UsersResponse;
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body;
}

export default function UsersPage() {
  const { t } = useTranslation();

  const [users, setUsers] = useState<DocData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [capped, setCapped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  // The effective query: empty until the user has typed at least 3 characters.
  const [query, setQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocData | null>(null);

  // Debounce the search box into a query term (fires the server search once the
  // third character is typed, per requirement).
  useEffect(() => {
    const term = search.trim();
    const id = setTimeout(
      () => setQuery(term.length >= MIN_SEARCH_CHARS ? term : ""),
      300
    );
    return () => clearTimeout(id);
  }, [search]);

  // Load the first page whenever the effective query changes (including back to
  // the full list when the search is cleared).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (query) params.set("q", query);

    fetchUsers(params)
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users);
        setNextCursor(data.nextCursor);
        setCapped(data.capped);
        if (typeof data.total === "number") setTotal(data.total);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({ cursor: nextCursor });
      const data = await fetchUsers(params);
      setUsers((prev) => [...prev, ...data.users]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  const updateUser = async (id: string, fields: Record<string, unknown>) => {
    const res = await fetch("/api/firestore", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: "Users", id, data: fields }),
    });
    if (res.status === 401) notifySessionExpired();
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? res.statusText);
    }
    // Reflect the change locally without refetching the whole page.
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...fields } : u)));
  };

  const fields: FieldConfig[] = [
    { key: "user_names", label: t("users.fields.name"), type: "text" },
    { key: "user_email", label: t("users.fields.email"), type: "text", disabled: true },
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

  const searching = query.length >= MIN_SEARCH_CHARS;

  return (
    <div>
      <PageHeader title={t("users.title")} count={total} />
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("users.searchPlaceholder")}
        resultCount={searching ? users.length : undefined}
        totalCount={searching ? total : undefined}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("users.loadError")} {error}
        </div>
      )}

      {searching && capped && (
        <div className="mb-4 rounded-lg border border-[var(--accent-light)] bg-[var(--accent-subtle)] px-4 py-3 text-sm text-[var(--accent)]">
          {t("users.capped")}
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        onEdit={(item) => { setEditing(item); setModalOpen(true); }}
        onDelete={() => {}}
      />

      {!searching && nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[var(--shadow-sm)]"
          >
            {loadingMore && (
              <span className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            )}
            {t("users.loadMore")}
          </button>
        </div>
      )}

      <FormModal
        title={t("users.editTitle")}
        fields={fields}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (formData) => {
          if (editing) {
            await updateUser(editing.id, {
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
