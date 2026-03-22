"use client";

import { useRef, useState, useCallback } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function detectDurationFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        resolve(formatDuration(video.duration));
      } else {
        resolve(null);
      }
      video.src = "";
    };
    video.onerror = () => { resolve(null); video.src = ""; };
    // Timeout after 10s
    setTimeout(() => { resolve(null); video.src = ""; }, 10000);
    video.src = url;
  });
}

function detectDurationFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        resolve(formatDuration(video.duration));
      } else {
        resolve(null);
      }
      URL.revokeObjectURL(objectUrl);
    };
    video.onerror = () => { resolve(null); URL.revokeObjectURL(objectUrl); };
    video.src = objectUrl;
  });
}

interface FileUploaderProps {
  value: string;
  onChange: (url: string) => void;
  onDurationDetected?: (duration: string) => void;
  storagePath?: string;
  accept?: string;
  label?: string;
}

export default function FileUploader({
  value,
  onChange,
  onDurationDetected,
  storagePath = "uploads",
  accept = "video/*",
  label = "Upload file",
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [detectedDuration, setDetectedDuration] = useState<string | null>(null);

  const reportDuration = useCallback((dur: string | null) => {
    if (dur) {
      setDetectedDuration(dur);
      onDurationDetected?.(dur);
    }
  }, [onDurationDetected]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setUploading(true);
    setProgress(0);
    setDetectedDuration(null);

    // Detect duration from local file (fast, no network needed)
    detectDurationFromFile(file).then(reportDuration);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `${storagePath}/${timestamp}_${safeName}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(pct);
      },
      (err) => {
        setError(err.message);
        setUploading(false);
        setProgress(0);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onChange(downloadURL);
        setUploading(false);
        setProgress(100);
      }
    );

    e.target.value = "";
  };

  const handleUrlPaste = async (newUrl: string) => {
    onChange(newUrl);
    setDetectedDuration(null);
    if (newUrl && (newUrl.startsWith("http://") || newUrl.startsWith("https://"))) {
      const dur = await detectDurationFromUrl(newUrl);
      reportDuration(dur);
    }
  };

  const hasUrl = Boolean(value);

  return (
    <div className="space-y-2">
      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => handleUrlPaste(e.target.value)}
          placeholder="Paste URL or upload a file..."
          className="flex-1 border border-[var(--border)] bg-[var(--surface)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] bg-[var(--surface)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background)] hover:border-[var(--accent)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {label}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload progress */}
      {uploading && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-secondary)] font-medium truncate mr-2">
              {fileName}
            </span>
            <span className="text-[var(--accent)] font-semibold flex-shrink-0">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success + duration */}
      {!uploading && hasUrl && (
        <div className="flex items-center gap-3 flex-wrap">
          {fileName && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="font-medium">Uploaded</span>
            </div>
          )}
          {detectedDuration && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border)] rounded-md px-2.5 py-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="font-medium">Duration auto-detected: {detectedDuration}</span>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-[12px] text-red-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}
