"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { notifySessionExpired } from "@/lib/sessionExpiry";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import PageHeader from "@/components/PageHeader";

const inputClass =
  "w-full h-12 px-4 pr-12 rounded-xl border-2 border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(4,120,87,0.12)] outline-none transition";

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
  toggleLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  toggleLabel: string;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2 tracking-wide uppercase">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {show ? (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearMessages = () => {
    setError(null);
    setSuccess(false);
  };

  // Same checks as the server (lib/admin-credentials.ts: checkPasswordChange),
  // except the current password, which only the server can verify.
  const validate = (): string | null => {
    if (!currentPassword || !newPassword || !confirmPassword) return "missingFields";
    if (newPassword !== confirmPassword) return "mismatch";
    if (newPassword.length < MIN_PASSWORD_LENGTH) return "tooShort";
    if (newPassword === currentPassword) return "sameAsCurrent";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      if (res.status === 401) {
        notifySessionExpired();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(typeof data.error === "string" ? data.error : "generic");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch {
      setError("generic");
    } finally {
      setSubmitting(false);
    }
  };

  const allFilled = Boolean(currentPassword && newPassword && confirmPassword);
  const mismatch = Boolean(confirmPassword) && newPassword !== confirmPassword;

  return (
    <div className="max-w-xl">
      <PageHeader title={t("security.title")} />

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6 sm:p-8">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{t("security.cardTitle")}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1.5 mb-6">{t("security.hint")}</p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <PasswordField
            label={t("security.currentPassword")}
            value={currentPassword}
            onChange={(v) => { setCurrentPassword(v); clearMessages(); }}
            autoComplete="current-password"
            show={show.current}
            onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
            toggleLabel={t(show.current ? "security.hide" : "security.show")}
          />
          <PasswordField
            label={t("security.newPassword")}
            value={newPassword}
            onChange={(v) => { setNewPassword(v); clearMessages(); }}
            autoComplete="new-password"
            show={show.next}
            onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
            toggleLabel={t(show.next ? "security.hide" : "security.show")}
          />
          <PasswordField
            label={t("security.confirmPassword")}
            value={confirmPassword}
            onChange={(v) => { setConfirmPassword(v); clearMessages(); }}
            autoComplete="new-password"
            show={show.confirm}
            onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            toggleLabel={t(show.confirm ? "security.hide" : "security.show")}
          />
          {mismatch && !error && (
            <p className="text-xs text-red-600 -mt-3">{t("security.errors.mismatch")}</p>
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {t(`security.errors.${error}`)}
            </div>
          )}
          {success && (
            <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              {t("security.success")}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !allFilled}
            className="w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm shadow-[var(--shadow-sm)] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "..." : t("security.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
