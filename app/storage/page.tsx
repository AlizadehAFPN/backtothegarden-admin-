"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import PageHeader from "@/components/PageHeader";

interface StorageFile {
  name: string;
  folder: string;
  url: string;
  size: number;
  contentType: string;
  timeCreated: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function folderLabel(folder: string): string {
  switch (folder) {
    case "videos":
      return "Videos Exclusivos";
    case "recipes/videos":
      return "Recetas";
    case "masterclasses/videos":
      return "Master Classes";
    default:
      return folder;
  }
}

export default function StoragePage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/storage");
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async (file: StorageFile) => {
    if (!confirm(`Delete "${file.name}"?\n\nThis cannot be undone.`)) return;

    setDeleting(`${file.folder}/${file.name}`);
    try {
      const res = await fetch("/api/storage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: file.folder, name: file.name }),
      });
      if (res.ok) {
        setFiles((prev) =>
          prev.filter(
            (f) => !(f.folder === file.folder && f.name === file.name)
          )
        );
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(null);
    }
  };

  const filteredFiles =
    filter === "all" ? files : files.filter((f) => f.folder === filter);

  const folders = [...new Set(files.map((f) => f.folder))];

  return (
    <div>
      <PageHeader
        title={t("storage.title")}
        count={filteredFiles.length}
      />

      {/* Filter tabs */}
      {folders.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
              filter === "all"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]"
            }`}
          >
            {t("storage.all")} ({files.length})
          </button>
          {folders.map((folder) => (
            <button
              key={folder}
              onClick={() => setFilter(folder)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                filter === folder
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]"
              }`}
            >
              {folderLabel(folder)} (
              {files.filter((f) => f.folder === folder).length})
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredFiles.length === 0 && (
        <div className="text-center py-20 text-[var(--text-muted)]">
          {t("storage.empty")}
        </div>
      )}

      {/* File grid */}
      {!loading && filteredFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const isVideo = file.contentType.startsWith("video/");
            const isDeleting =
              deleting === `${file.folder}/${file.name}`;

            return (
              <div
                key={`${file.folder}/${file.name}`}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden group"
              >
                {/* Preview */}
                <div className="relative aspect-video bg-black/5">
                  {isVideo ? (
                    <video
                      src={file.url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      onMouseEnter={(e) =>
                        (e.target as HTMLVideoElement).play().catch(() => {})
                      }
                      onMouseLeave={(e) => {
                        const v = e.target as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }}
                    />
                  ) : (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Folder badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded-md">
                    {folderLabel(file.folder)}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <p
                    className="text-xs font-medium text-[var(--text-primary)] truncate"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-[var(--text-muted)] space-y-0.5">
                      <p>{formatSize(file.size)}</p>
                      <p>{formatDate(file.timeCreated)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <span className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      )}
                      {t("storage.delete")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
