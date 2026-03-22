"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import PageHeader from "@/components/PageHeader";

interface StorageFile {
  name: string;
  folder: string;
  fullPath: string;
  url: string;
  size: number;
  contentType: string;
  timeCreated: string;
}

const PAGE_SIZE = 20;

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
  const labels: Record<string, string> = {
    "/": "Root",
    "data": "Data (images)",
    "data/videos_exclusivos": "Videos Exclusivos",
    "data/recetas": "Recetas",
    "data/masterclasses/Charlas educativas con Dres Frey": "Master Classes",
    "data/meal_plans/days": "Meal Plans",
    "data/guias_pdf": "Guias PDF",
    "data/Tienda": "Tienda",
    "data/higiene": "Higiene",
    "UsersPictureProfile": "User Photos",
    "videos": "Videos (new)",
    "recipes/videos": "Recipes Videos (new)",
    "masterclasses/videos": "Masterclasses Videos (new)",
    "uploads": "Uploads",
  };
  return labels[folder] || folder;
}

function typeIcon(contentType: string): string {
  if (contentType.startsWith("video/")) return "🎬";
  if (contentType.startsWith("image/")) return "🖼️";
  if (contentType.includes("pdf")) return "📄";
  return "📁";
}

export default function StoragePage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<StorageFile | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/storage");
      const data = await res.json();
      setFiles(data.files || []);
      setFolders(data.folders || []);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const handleDelete = async (file: StorageFile) => {
    if (!confirm(`⚠️ PERMANENT DELETE\n\nAre you sure you want to delete "${file.name}"?\n\nThis file will be permanently deleted from Firebase Storage and cannot be recovered.`)) return;

    setDeleting(file.fullPath);
    try {
      const res = await fetch("/api/storage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullPath: file.fullPath }),
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.fullPath !== file.fullPath));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(null);
    }
  };

  const filteredFiles =
    filter === "all" ? files : files.filter((f) => f.folder === filter);

  const totalPages = Math.ceil(filteredFiles.length / PAGE_SIZE);
  const paginatedFiles = filteredFiles.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

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

      {/* File table */}
      {!loading && paginatedFiles.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Preview</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Folder</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Size</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFiles.map((file) => {
                const isDeleting = deleting === file.fullPath;
                const isVideo = file.contentType.startsWith("video/");
                const isImage = file.contentType.startsWith("image/");
                return (
                  <tr
                    key={file.fullPath}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)] transition-colors cursor-pointer"
                    onClick={() => setPreview(file)}
                  >
                    <td className="px-4 py-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center flex-shrink-0">
                        {isImage ? (
                          <img src={file.url} alt="" className="w-full h-full object-cover" />
                        ) : isVideo ? (
                          <video src={file.url} className="w-full h-full object-cover" preload="metadata" muted />
                        ) : (
                          <span className="text-lg">{typeIcon(file.contentType)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[300px]" title={file.name}>
                        {file.name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-[var(--background)] text-[var(--text-muted)] text-[10px] font-medium rounded-md border border-[var(--border)]">
                        {folderLabel(file.folder)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatSize(file.size)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(file.timeCreated)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer disabled:opacity-50"
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-lg)] max-w-3xl w-full max-h-[90vh] overflow-hidden border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{preview.name}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {folderLabel(preview.folder)} &middot; {formatSize(preview.size)} &middot; {formatDate(preview.timeCreated)}
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] cursor-pointer flex-shrink-0 ml-4"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex items-center justify-center bg-black/5 max-h-[70vh] overflow-auto">
              {preview.contentType.startsWith("video/") ? (
                <video
                  src={preview.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh]"
                />
              ) : preview.contentType.startsWith("image/") ? (
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : (
                <div className="py-20 text-center text-[var(--text-muted)]">
                  <p className="text-4xl mb-3">{typeIcon(preview.contentType)}</p>
                  <p className="text-sm">Preview not available</p>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 px-4 py-2 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)]"
                  >
                    Open file
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[var(--text-muted)]">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredFiles.length)} of {filteredFiles.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--background)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 text-xs font-medium rounded-lg transition cursor-pointer ${
                    page === pageNum
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--background)]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--background)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
