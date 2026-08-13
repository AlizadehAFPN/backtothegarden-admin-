"use client";

import { useRef, useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { ensureFirebaseAuth } from "@/lib/uploadFile";
import { fileKindFromUrl, fileNameFromUrl } from "@/lib/fileUrl";
import { useTranslation } from "@/i18n/LanguageContext";

interface PdfUploaderProps {
  value: string;
  onChange: (url: string) => void;
  storagePath?: string;
  label?: string;
  disabled?: boolean;
}

/** Some browsers report an empty MIME type, so fall back to the extension. */
function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/**
 * Guides run to tens of megabytes, well past the request limit of the server
 * upload route, so PDFs go straight to Firebase Storage like videos do.
 */
export default function PdfUploader({
  value,
  onChange,
  storagePath = "uploads/pdfs",
  label,
  disabled = false,
}: PdfUploaderProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<ReturnType<typeof uploadBytesResumable> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleCancel = () => {
    uploadTaskRef.current?.cancel();
    uploadTaskRef.current = null;
    setUploading(false);
    setProgress(0);
    setFileName(null);
    setError(null);
  };

  /** Clears the stored PDF so another one can be uploaded while editing. */
  const handleRemove = () => {
    onChange("");
    setFileName(null);
    setProgress(0);
    setError(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!isPdfFile(file)) {
      setError(t("form.onlyPdfAllowed"));
      return;
    }

    setError(null);
    setFileName(file.name);
    setUploading(true);
    setProgress(0);

    try {
      await ensureFirebaseAuth(t("form.uploadTokenError"));
    } catch (authErr) {
      setError(authErr instanceof Error ? authErr.message : t("form.authError"));
      setUploading(false);
      setFileName(null);
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `${storagePath}/${Date.now()}_${safeName}`);
    // Pin the content type: the app downloads this URL as a PDF, and a file
    // stored as octet-stream opens as a broken download on some devices.
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: "application/pdf",
    });
    uploadTaskRef.current = uploadTask;

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (err) => {
        uploadTaskRef.current = null;
        setUploading(false);
        setProgress(0);
        // Cancelling is a deliberate action, not a failure worth reporting.
        if ((err as { code?: string }).code !== "storage/canceled") {
          setError(err.message);
        }
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onChange(downloadURL);
          setProgress(100);
        } catch (err) {
          // The bytes are stored but the URL lookup failed; without this the
          // progress bar would sit at 100% forever.
          setError(err instanceof Error ? err.message : t("form.uploadFailed"));
          setProgress(0);
        } finally {
          uploadTaskRef.current = null;
          setUploading(false);
        }
      }
    );
  };

  const displayName = fileName ?? fileNameFromUrl(value);
  // Only flag links whose extension says it is something else — plenty of valid
  // URLs carry no extension at all.
  const wrongFileType = Boolean(value) && fileKindFromUrl(value) === "other";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setFileName(null);
            onChange(e.target.value);
          }}
          placeholder={t("form.pastePdfUrl")}
          disabled={disabled}
          className={`flex-1 border border-[var(--border)] bg-[var(--surface)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] bg-[var(--surface)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background)] hover:border-[var(--accent)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {label ?? t("form.uploadPdf")}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
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
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[var(--accent)] font-semibold">{progress}%</span>
              <button
                type="button"
                onClick={handleCancel}
                className="text-[var(--text-muted)] hover:text-red-500 transition cursor-pointer"
                title={t("form.cancelUpload")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Current file: open it, or clear it and upload another one */}
      {!uploading && value && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0 text-[12px] text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border)] rounded-md px-2.5 py-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[var(--accent)]">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="font-medium truncate max-w-[280px]">
              {displayName || t("form.fileSet")}
            </span>
          </div>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent)] hover:underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {t("form.viewPdf")}
          </a>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-500 hover:text-red-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            {t("form.remove")}
          </button>
        </div>
      )}

      {/* The app always downloads this file as a .pdf, so anything else is broken there. */}
      {!uploading && wrongFileType && (
        <div className="flex items-start gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="font-medium">{t("form.notAPdf")}</span>
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
