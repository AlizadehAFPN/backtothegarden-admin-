"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n/LanguageContext";

interface DateTimePickerProps {
  /** Local datetime string "YYYY-MM-DDTHH:mm" (same as <input type="datetime-local">). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function toValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function parseValue(v: string): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT = 420;

interface Position {
  left: number;
  openUp: boolean;
  offset: number;
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: DateTimePickerProps) {
  const { t } = useTranslation();
  const selected = useMemo(() => parseValue(value), [value]);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [viewYear, setViewYear] = useState(() => (selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected ?? new Date()).getMonth());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const base = selected ?? now;
  const h24 = base.getHours();
  const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const minute = base.getMinutes();

  const commitDate = (next: Date) => onChange(toValue(next));

  const pickDay = (day: Date) => {
    const d = new Date(base);
    d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    commitDate(d);
  };

  const setTimeParts = (nextHour12: number, nextMinute: number, nextAmpm: "AM" | "PM") => {
    const clampedH = Math.min(12, Math.max(1, nextHour12));
    const clampedM = Math.min(59, Math.max(0, nextMinute));
    const h = nextAmpm === "PM" ? (clampedH % 12) + 12 : clampedH % 12;
    const d = new Date(base);
    d.setHours(h, clampedM, 0, 0);
    commitDate(d);
  };

  const computePosition = useCallback((): Position | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < POPOVER_HEIGHT && rect.top > spaceBelow;
    return {
      left: Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8)),
      openUp,
      offset: openUp ? window.innerHeight - rect.top + 4 : rect.bottom + 4,
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => setPosition(computePosition());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openPicker = () => {
    const ref = selected ?? new Date();
    setViewYear(ref.getFullYear());
    setViewMonth(ref.getMonth());
    setOpen(true);
  };

  const stepMonth = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startWeekday = first.getDay();
    return Array.from({ length: 42 }, (_, i) => new Date(viewYear, viewMonth, i - startWeekday + 1));
  }, [viewYear, viewMonth]);

  const displayLabel = selected
    ? selected.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const timeInputClass =
    "w-12 text-center border border-[var(--border)] bg-[var(--surface)] rounded-lg px-1 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent";

  const popover =
    open && position
      ? createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[60] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] p-3 animate-in"
            style={{
              left: position.left,
              width: POPOVER_WIDTH,
              [position.openUp ? "bottom" : "top"]: position.offset,
            }}
          >
            {/* Month header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] cursor-pointer"
                aria-label="Previous month"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={() => stepMonth(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] cursor-pointer"
                aria-label="Next month"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Weekday row */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-[var(--text-muted)] py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((date, i) => {
                const inMonth = date.getMonth() === viewMonth;
                const isSel = selected != null && sameDay(date, selected);
                const isToday = sameDay(date, now);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickDay(date)}
                    className={`h-9 rounded-lg text-[13px] cursor-pointer transition flex items-center justify-center ${
                      isSel
                        ? "bg-[var(--accent)] text-white font-semibold shadow-[var(--shadow-sm)]"
                        : inMonth
                          ? "text-[var(--text-primary)] hover:bg-[var(--accent-subtle)]"
                          : "text-[var(--text-muted)]/50 hover:bg-[var(--background)]"
                    } ${isToday && !isSel ? "ring-1 ring-inset ring-[var(--accent)]/50 font-semibold" : ""}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Time */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                {t("datetime.time")}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={hour12}
                  onChange={(e) => setTimeParts(Number(e.target.value), minute, ampm)}
                  className={timeInputClass}
                  aria-label="Hour"
                />
                <span className="font-semibold text-[var(--text-muted)]">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={pad(minute)}
                  onChange={(e) => setTimeParts(hour12, Number(e.target.value), ampm)}
                  className={timeInputClass}
                  aria-label="Minute"
                />
                <div className="flex flex-col gap-0.5 ml-1">
                  {(["AM", "PM"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTimeParts(hour12, minute, p)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition ${
                        ampm === p
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--text-muted)] hover:bg-[var(--background)]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] hover:text-red-500 rounded-lg hover:bg-red-50 cursor-pointer"
              >
                {t("datetime.clear")}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { commitDate(new Date()); setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); }}
                  className="px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--background)] cursor-pointer"
                >
                  {t("datetime.now")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-1.5 text-[12px] font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] cursor-pointer shadow-[var(--shadow-sm)]"
                >
                  {t("datetime.done")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="w-full inline-flex items-center justify-between gap-2 border border-[var(--border)] bg-[var(--surface)] rounded-lg px-3.5 py-2.5 text-sm cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
      >
        <span className={`flex-1 text-left truncate ${displayLabel ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
          {displayLabel || placeholder || t("datetime.placeholder")}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--text-muted)]">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
      {popover}
    </>
  );
}
