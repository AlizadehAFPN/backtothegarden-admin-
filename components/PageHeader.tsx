"use client";

import { useTranslation } from "@/i18n/LanguageContext";

interface PageHeaderProps {
  title: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
}

export default function PageHeader({
  title,
  count,
  onAdd,
  addLabel,
}: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">{title}</h1>
        {count !== undefined && (
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            {count} {t("header.records")}
          </p>
        )}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] text-sm font-medium cursor-pointer shadow-[var(--shadow-sm)]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-90">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {addLabel ?? t("header.add")}
        </button>
      )}
    </div>
  );
}
