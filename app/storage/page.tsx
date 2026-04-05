"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import PageHeader from "@/components/PageHeader";

interface StorageFile {
  name: string;
  fullPath: string;
  url: string;
  size: number;
  contentType: string;
  timeCreated: string;
}

interface SubFolder {
  name: string;
  fullPath: string;
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

export default function StoragePage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [subfolders, setSubfolders] = useState<SubFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<StorageFile | null>(null);

  const fetchFiles = useCallback(async (prefix: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/storage?prefix=${encodeURIComponent(prefix)}`);
      const data = await res.json();
      setFiles(data.files || []);
      setSubfolders(data.subfolders || []);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
    setPage(1);
  }, [currentPath, fetchFiles]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const handleDelete = async (file: StorageFile) => {
    if (!confirm(`\u26A0\uFE0F PERMANENT DELETE\n\nAre you sure you want to delete "${file.name}"?\n\nThis file will be permanently deleted from Firebase Storage and cannot be recovered.`)) return;

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

  // Breadcrumb parts
  const pathParts = currentPath
    ? currentPath.replace(/\/$/, "").split("/")
    : [];

  const totalPages = Math.ceil(files.length / PAGE_SIZE);
  const paginatedFiles = files.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div>
      <PageHeader
        title={t("storage.title")}
        count={files.length}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 flex-wrap text-sm">
        <button
          onClick={() => navigateTo("")}
          className={`px-2 py-1 rounded-md transition cursor-pointer ${
            currentPath === ""
              ? "text-[var(--accent)] font-medium"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Storage
        </button>
        {pathParts.map((part, i) => {
          const path = pathParts.slice(0, i + 1).join("/") + "/";
          const isLast = i === pathParts.length - 1;
          return (
            <span key={path} className="flex items-center gap-1">
              <span className="text-[var(--text-muted)]">/</span>
              <button
                onClick={() => navigateTo(path)}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  isLast
                    ? "text-[var(--accent)] font-medium"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {part}
              </button>
            </span>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] w-14">Preview</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Size</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Subfolders */}
              {subfolders.map((folder) => (
                <tr
                  key={folder.fullPath}
                  className="border-b border-[var(--border)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                  onClick={() => navigateTo(folder.fullPath)}
                >
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-lg">
                      📁
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {folder.name}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">—</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">—</td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--text-muted)]">—</td>
                </tr>
              ))}

              {/* Files */}
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
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center flex-shrink-0 border border-[var(--border)]">
                        {isImage ? (
                          <img
                            src={file.url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:18px">🖼️</span>';
                            }}
                          />
                        ) : isVideo ? (
                          <video
                            src={file.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                            onError={(e) => {
                              (e.target as HTMLVideoElement).style.display = "none";
                              (e.target as HTMLVideoElement).parentElement!.innerHTML = '<span style="font-size:18px">🎬</span>';
                            }}
                          />
                        ) : (
                          <span className="text-lg">
                            {file.contentType.includes("pdf") ? "📄" : "📁"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[400px]" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{file.contentType}</p>
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
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

              {/* Empty */}
              {subfolders.length === 0 && files.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-[var(--text-muted)] text-sm">
                    {t("storage.empty")}
                  </td>
                </tr>
              )}
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{preview.name}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {formatSize(preview.size)} &middot; {formatDate(preview.timeCreated)}
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
            <div className="flex items-center justify-center bg-black/5 max-h-[70vh] overflow-auto">
              {preview.contentType.startsWith("video/") ? (
                <video src={preview.url} controls autoPlay className="max-w-full max-h-[70vh]" />
              ) : preview.contentType.startsWith("image/") ? (
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-[70vh] object-contain" />
              ) : (
                <div className="py-20 text-center text-[var(--text-muted)]">
                  <p className="text-4xl mb-3">{preview.contentType.includes("pdf") ? "📄" : "📁"}</p>
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
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, files.length)} of {files.length} files
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
