"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from "@/i18n/LanguageContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setIsSubmitting(true);
    const success = await login(username, password);
    if (!success) {
      setError(true);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left panel - dark branded side */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] bg-[var(--sidebar-bg)] relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/[0.02]" />
        <div className="absolute top-1/2 right-12 w-48 h-48 rounded-full bg-[var(--accent)]/10" />

        {/* Top content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-lg">
              BTG
            </div>
            <span className="text-white/80 font-medium text-sm tracking-wide">ADMIN</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Back to<br />the Garden
          </h2>
          <p className="text-white/40 mt-4 text-base leading-relaxed max-w-[300px]">
            {t("login.subtitle")}
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="relative z-10">
          <div className="flex gap-2">
            <div className="w-12 h-1 rounded-full bg-[var(--accent)]" />
            <div className="w-8 h-1 rounded-full bg-white/20" />
            <div className="w-4 h-1 rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center bg-[var(--background)] px-6 sm:px-12 relative">
        {/* Language switcher - top right */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
          <div className="flex items-center gap-0.5 bg-white border border-[var(--border)] rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setLocale("es")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                locale === "es"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              ES
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                locale === "en"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-lg">
              BTG
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Back to the Garden</h1>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("login.submit")}
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1.5">
              {t("login.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2 tracking-wide uppercase">
                {t("login.username")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(false);
                }}
                className="w-full h-12 px-4 rounded-xl border-2 border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(4,120,87,0.12)] outline-none transition"
                placeholder={t("login.usernamePlaceholder")}
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2 tracking-wide uppercase">
                {t("login.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  className="w-full h-12 px-4 rounded-xl border-2 border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(4,120,87,0.12)] outline-none transition pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
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

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {t("login.error")}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm shadow-[0_4px_12px_rgba(4,120,87,0.35)] hover:shadow-[0_6px_20px_rgba(4,120,87,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isSubmitting ? "..." : t("login.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
