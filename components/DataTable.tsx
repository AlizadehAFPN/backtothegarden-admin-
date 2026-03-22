"use client";

import { useState } from "react";
import { DocData } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: DocData) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: DocData[];
  loading: boolean;
  onEdit: (item: DocData) => void;
  onDelete: (id: string) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function DataTable({
  columns,
  data,
  loading,
  onEdit,
  onDelete,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full bg-[var(--background)] flex items-center justify-center mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[var(--text-muted)]">
            <path d="M20 6H4M20 12H4M20 18H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-muted)]">{t("table.noData")}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-5 py-3.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {paginatedData.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--accent-subtle)] group">
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5 text-[13px] text-[var(--text-primary)]">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
                <td className="px-5 py-3.5 text-right">
                  <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(row)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-light)] rounded-md cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      {t("table.edit")}
                    </button>
                    <button
                      onClick={() => onDelete(row.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      {t("table.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border)] bg-[var(--background)]/50">
        <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
          <span>{t("table.show")}</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-[var(--border)] bg-[var(--surface)] rounded-md px-2 py-1.5 text-[12px] text-[var(--text-secondary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>{t("table.perPage")}</span>
          <span className="ml-3 text-[var(--text-muted)]">
            {startIndex + 1}–{Math.min(endIndex, data.length)} {t("table.of")}{" "}
            <span className="font-medium text-[var(--text-secondary)]">{data.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {getPageNumbers().map((page, i) =>
            page === "..." ? (
              <span key={`dots-${i}`} className="px-1.5 text-[var(--text-muted)] text-xs">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(Number(page))}
                className={`min-w-[32px] h-8 text-[12px] font-medium rounded-md cursor-pointer ${
                  currentPage === page
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)] text-[var(--text-secondary)]"
                }`}
              >
                {page}
              </button>
            )
          )}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
