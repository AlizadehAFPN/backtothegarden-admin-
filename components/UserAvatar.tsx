"use client";

import { useState } from "react";

const SKIP_PATTERNS = ["imgUserDefault", "URL_DEFAULT_IMAGE"];

function shouldSkip(url: string): boolean {
  return SKIP_PATTERNS.some((pattern) => url.includes(pattern));
}

export default function UserAvatar({ src }: { src: unknown }) {
  const [failed, setFailed] = useState(false);
  const url = typeof src === "string" ? src.trim() : "";

  if (!url || failed || url === "null" || shouldSkip(url)) {
    return (
      <div className="w-9 h-9 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--text-muted)]">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className="w-9 h-9 rounded-full object-cover bg-[var(--background)] border border-[var(--border)]"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setFailed(true)}
    />
  );
}
