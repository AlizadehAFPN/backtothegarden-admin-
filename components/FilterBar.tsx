"use client";

import { useTranslation } from "@/i18n/LanguageContext";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    allLabel?: string;
    icon?: React.ReactNode;
  }[];
  resultCount?: number;
  totalCount?: number;
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  resultCount,
  totalCount,
}: FilterBarProps) {
  const { t } = useTranslation();
  const isFiltered = searchValue || filters.some((f) => f.value);

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-4 py-3 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
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
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? t("common.search")}
            className="w-full border border-[var(--border)] bg-[var(--background)] rounded-lg pl-9 pr-8 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Divider */}
        {filters.length > 0 && (
          <div className="w-px h-7 bg-[var(--border)]" />
        )}

        {/* Filter dropdowns */}
        {filters.map((filter, i) => (
          <div key={i} className="relative">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className={`appearance-none border rounded-lg pl-3 pr-8 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent ${
                filter.value
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] font-medium"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]"
              }`}
            >
              <option value="">{filter.allLabel ?? t("common.all")}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                filter.value ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              }`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        ))}

        {/* Result count badge */}
        {isFiltered && resultCount != null && totalCount != null && (
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-light)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {resultCount} {t("table.of")} {totalCount}
            </span>
            <button
              onClick={() => {
                onSearchChange("");
                filters.forEach((f) => f.onChange(""));
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--background)] cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              {t("common.clear")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
