"use client";

import { useTranslation } from "@/i18n/LanguageContext";
import { getYoutubeThumbnail, getYoutubeVideoId } from "@/lib/youtube";

interface YoutubeUrlInputProps {
  value: string;
  onChange: (url: string) => void;
}

/**
 * Text input for a YouTube link, with the same "set / preview / remove" shape as
 * ImageUploader so switching between an uploaded file and a link is symmetric
 * when editing an existing record.
 */
export default function YoutubeUrlInput({ value, onChange }: YoutubeUrlInputProps) {
  const { t } = useTranslation();
  const trimmed = value.trim();
  const videoId = getYoutubeVideoId(trimmed);
  const thumbnail = getYoutubeThumbnail(trimmed);
  const invalid = trimmed !== "" && videoId === null;

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        className={`w-full border rounded-lg px-3.5 py-2.5 text-sm bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent transition ${
          invalid
            ? "border-red-400 focus:ring-red-400"
            : "border-[var(--border)] focus:ring-[var(--accent)]"
        }`}
      />

      {invalid && (
        <p className="flex items-center gap-1.5 text-[12px] text-red-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="font-medium">{t("form.invalidYoutubeUrl")}</span>
        </p>
      )}

      {thumbnail && (
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt=""
              className="w-16 h-16 rounded-lg object-cover border border-[var(--border)]"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-black/60">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <polygon points="6 4 20 12 6 20" />
                </svg>
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              {t("form.youtubeVideo")}
            </span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-500 hover:text-red-600 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {t("form.remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
