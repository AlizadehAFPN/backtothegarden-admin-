"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Handle = "nw" | "ne" | "sw" | "se";
type DragMode = "move" | Handle;

interface ImageCropModalProps {
  src: string;
  onConfirm: (blob: Blob) => void;
  onUseOriginal: () => void;
  onCancel: () => void;
}

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

const MIN_SIZE = 24; // displayed px

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export default function ImageCropModal({
  src,
  onConfirm,
  onUseOriginal,
  onCancel,
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startRect: Rect;
  } | null>(null);

  // Fit a centred crop box of the given aspect inside the displayed image.
  const fitCrop = useCallback(
    (w: number, h: number, ar: number | null): Rect => {
      if (ar === null) {
        return { x: 0, y: 0, w, h };
      }
      let cw = w;
      let ch = cw / ar;
      if (ch > h) {
        ch = h;
        cw = ch * ar;
      }
      return { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch };
    },
    []
  );

  const handleImgLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setImgSize({ w: rect.width, h: rect.height });
    setCrop(fitCrop(rect.width, rect.height, aspect));
  };

  const applyAspect = (ar: number | null) => {
    setAspect(ar);
    if (imgSize) setCrop(fitCrop(imgSize.w, imgSize.h, ar));
  };

  const onPointerDown = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!crop) return;
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...crop },
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const el = imgRef.current;
      if (!drag || !el || !imgSize) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const { startRect } = drag;

      if (drag.mode === "move") {
        setCrop({
          x: clamp(startRect.x + dx, 0, imgSize.w - startRect.w),
          y: clamp(startRect.y + dy, 0, imgSize.h - startRect.h),
          w: startRect.w,
          h: startRect.h,
        });
        return;
      }

      // Corner resize: the opposite corner stays anchored.
      const anchor = {
        x: drag.mode === "nw" || drag.mode === "sw" ? startRect.x + startRect.w : startRect.x,
        y: drag.mode === "nw" || drag.mode === "ne" ? startRect.y + startRect.h : startRect.y,
      };
      // Current dragged corner position (clamped to image bounds).
      const cornerStartX = drag.mode === "ne" || drag.mode === "se" ? startRect.x + startRect.w : startRect.x;
      const cornerStartY = drag.mode === "sw" || drag.mode === "se" ? startRect.y + startRect.h : startRect.y;
      let px = clamp(cornerStartX + dx, 0, imgSize.w);
      let py = clamp(cornerStartY + dy, 0, imgSize.h);

      if (aspect) {
        const signX = px >= anchor.x ? 1 : -1;
        const signY = py >= anchor.y ? 1 : -1;
        let w = Math.abs(px - anchor.x);
        let h = Math.abs(py - anchor.y);
        // Lock to aspect using the dominant delta.
        if (w / aspect > h) h = w / aspect;
        else w = h * aspect;
        // Clamp within image while preserving aspect.
        const maxW = signX > 0 ? imgSize.w - anchor.x : anchor.x;
        const maxH = signY > 0 ? imgSize.h - anchor.y : anchor.y;
        if (w > maxW) {
          w = maxW;
          h = w / aspect;
        }
        if (h > maxH) {
          h = maxH;
          w = h * aspect;
        }
        px = anchor.x + signX * w;
        py = anchor.y + signY * h;
      }

      let x = Math.min(anchor.x, px);
      let y = Math.min(anchor.y, py);
      let w = Math.abs(px - anchor.x);
      let h = Math.abs(py - anchor.y);

      // Enforce a minimum size without escaping the image bounds.
      if (w < MIN_SIZE) {
        w = MIN_SIZE;
        if (x + w > imgSize.w) x = imgSize.w - w;
      }
      if (h < MIN_SIZE) {
        h = MIN_SIZE;
        if (y + h > imgSize.h) y = imgSize.h - h;
      }

      setCrop({ x, y, w, h });
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [imgSize, aspect]);

  const handleConfirm = () => {
    const el = imgRef.current;
    if (!el || !crop || !imgSize) return;
    setProcessing(true);
    try {
      const scaleX = el.naturalWidth / imgSize.w;
      const scaleY = el.naturalHeight / imgSize.h;
      const sx = crop.x * scaleX;
      const sy = crop.y * scaleY;
      const sw = crop.w * scaleX;
      const sh = crop.h * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onUseOriginal();
        return;
      }
      ctx.drawImage(el, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          setProcessing(false);
          if (blob) onConfirm(blob);
          else onUseOriginal();
        },
        "image/jpeg",
        0.92
      );
    } catch {
      setProcessing(false);
      onUseOriginal();
    }
  };

  const handles: Handle[] = ["nw", "ne", "sw", "se"];
  const handlePos: Record<Handle, string> = {
    nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
    ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
    sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
    se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-[var(--border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Crop image</h2>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Aspect ratio presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--text-muted)] mr-1">Aspect</span>
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => applyAspect(a.value)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border cursor-pointer transition ${
                  aspect === a.value
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--background)]"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Crop surface */}
          <div className="flex justify-center bg-[var(--background)] rounded-xl p-3 select-none">
            <div className="relative inline-block leading-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={src}
                alt="To crop"
                onLoad={handleImgLoad}
                draggable={false}
                className="max-h-[60vh] max-w-full block"
              />
              {crop && (
                <div
                  className="absolute border-2 border-white"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.w,
                    height: crop.h,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                    cursor: "move",
                    touchAction: "none",
                  }}
                  onPointerDown={onPointerDown("move")}
                >
                  {handles.map((h) => (
                    <div
                      key={h}
                      onPointerDown={onPointerDown(h)}
                      className={`absolute w-3 h-3 bg-white border border-[var(--accent)] rounded-sm ${handlePos[h]}`}
                      style={{ touchAction: "none" }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-[12px] text-[var(--text-muted)] text-center">
            Drag the box to move it, drag the corners to resize.
          </p>
        </div>

        <div className="flex justify-between gap-2.5 px-6 py-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onUseOriginal}
            disabled={processing}
            className="px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg cursor-pointer disabled:opacity-50"
          >
            Use original
          </button>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing || !crop}
              className="px-5 py-2.5 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer shadow-[var(--shadow-sm)]"
            >
              {processing ? "Processing…" : "Crop & use"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
