"use client";

import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from "@/i18n/LanguageContext";

export default function SessionExpiredModal() {
  const { sessionExpired, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();

  if (!sessionExpired || !isAuthenticated) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
      <div className="bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-sm border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {t("auth.sessionExpiredTitle")}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {t("auth.sessionExpiredMessage")}
          </p>
        </div>
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full px-5 py-2.5 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] cursor-pointer shadow-[var(--shadow-sm)]"
          >
            {t("auth.loginAgain")}
          </button>
        </div>
      </div>
    </div>
  );
}
