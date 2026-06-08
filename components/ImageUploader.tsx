"use client";

import { useRef, useState } from "react";
import { uploadImageViaServer } from "@/lib/uploadFile";
import ImageCropModal from "./ImageCropModal";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  storagePath?: string;
  label?: string;
}

export default function ImageUploader({
  value,
  onChange,
  storagePath = "uploads/images",
  label = "Upload Image",
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropName, setCropName] = useState("image");
  const pendingFileRef = useRef<File | null>(null);

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    pendingFileRef.current = null;
  };

  const doUpload = async (data: File | Blob, fileName: string) => {
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImageViaServer(data, fileName, storagePath, setProgress);
      onChange(url);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    pendingFileRef.current = file;
    setCropName(file.name);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = (blob: Blob) => {
    const base = cropName.replace(/\.[^.]+$/, "");
    closeCrop();
    void doUpload(blob, `${base}.jpg`);
  };

  const handleUseOriginal = () => {
    const file = pendingFileRef.current;
    closeCrop();
    if (file) void doUpload(file, file.name);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste image URL or upload a file..."
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
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload progress */}
      {uploading && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-secondary)] font-medium">Uploading image…</span>
            <span className="text-[var(--accent)] font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {!uploading && value && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-16 h-16 rounded-lg object-cover border border-[var(--border)]"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-500 hover:text-red-600 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Remove
          </button>
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

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onUseOriginal={handleUseOriginal}
          onCancel={closeCrop}
        />
      )}
    </div>
  );
}
