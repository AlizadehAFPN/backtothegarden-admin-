"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/i18n/LanguageContext";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  /** Placeholder shown when no value is selected. */
  placeholder?: string;
  /**
   * Show a search box inside the menu. Defaults to auto: enabled when there
   * are more than 8 options, or when `allowCustom` is set.
   */
  searchable?: boolean;
  /** Combobox mode: let the user commit a value that isn't in the list. */
  allowCustom?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Extra classes merged onto the trigger button. */
  className?: string;
  /** Render the trigger with accent styling when a value is selected (filter look). */
  highlightWhenSelected?: boolean;
  id?: string;
  ariaLabel?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
}

const MENU_MAX_HEIGHT = 280;

const SIZE_CLASSES: Record<NonNullable<DropdownProps["size"]>, string> = {
  sm: "px-2 py-1.5 text-[12px] rounded-md",
  md: "px-3.5 py-2.5 text-sm rounded-lg",
};

interface MenuPosition {
  left: number;
  width: number;
  openUp: boolean;
  /** Distance from the relevant edge; `top` when opening down, `bottom` when up. */
  offset: number;
  maxHeight: number;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder,
  searchable,
  allowCustom = false,
  disabled = false,
  size = "md",
  className = "",
  highlightWhenSelected = false,
  id,
  ariaLabel,
  searchPlaceholder,
  emptyLabel,
}: DropdownProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const showSearch = searchable ?? (allowCustom || options.length > 8);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );
  // In combobox mode a value may exist that isn't a listed option.
  const displayLabel = selectedOption?.label ?? (value ? value : "");

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // When combobox typing doesn't match an existing option, offer to commit it.
  const customOption: DropdownOption | null = useMemo(() => {
    if (!allowCustom) return null;
    const trimmed = query.trim();
    if (!trimmed) return null;
    const exists = options.some(
      (o) => o.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return null;
    return { value: trimmed, label: trimmed };
  }, [allowCustom, query, options]);

  const visibleOptions = useMemo(
    () => (customOption ? [customOption, ...filtered] : filtered),
    [customOption, filtered]
  );

  const computePosition = useCallback((): MenuPosition | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, 220) && spaceAbove > spaceBelow;
    const available = (openUp ? spaceAbove : spaceBelow) - 12;
    return {
      left: rect.left,
      width: rect.width,
      openUp,
      offset: openUp ? window.innerHeight - rect.top + 4 : rect.bottom + 4,
      maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, available)),
    };
  }, []);

  // Reposition while open, on scroll/resize of any ancestor.
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

  // Focus the search box when the menu opens.
  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    optionRefs.current[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    setQuery("");
    const idx = visibleOptionsIndexOfValue();
    setHighlight(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const visibleOptionsIndexOfValue = () => {
    const i = options.findIndex((o) => o.value === value);
    return customOption ? (i >= 0 ? i + 1 : -1) : i;
  };

  const close = () => {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const commit = (option: DropdownOption | undefined) => {
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const moveHighlight = (dir: 1 | -1) => {
    if (visibleOptions.length === 0) return;
    setHighlight((prev) => {
      let next = prev;
      for (let step = 0; step < visibleOptions.length; step++) {
        next = (next + dir + visibleOptions.length) % visibleOptions.length;
        if (!visibleOptions[next]?.disabled) return next;
      }
      return prev;
    });
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveHighlight(-1);
        break;
      case "Home":
        e.preventDefault();
        setHighlight(0);
        break;
      case "End":
        e.preventDefault();
        setHighlight(visibleOptions.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        commit(visibleOptions[highlight]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const onQueryChange = (next: string) => {
    setQuery(next);
    setHighlight(0);
  };

  const isSelected = Boolean(value);
  const triggerBase =
    "inline-flex items-center justify-between gap-2 border bg-[var(--surface)] text-[var(--text-primary)] cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed";
  const triggerState =
    highlightWhenSelected && isSelected
      ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] font-medium"
      : "border-[var(--border)]";

  const menu =
    open && position
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[60] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col animate-in"
            style={{
              left: position.left,
              width: position.width,
              [position.openUp ? "bottom" : "top"]: position.offset,
              maxHeight: position.maxHeight,
            }}
            onKeyDown={onMenuKeyDown}
          >
            {showSearch && (
              <div className="p-2 border-b border-[var(--border)] shrink-0">
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder={searchPlaceholder ?? t("common.search")}
                  className="w-full border border-[var(--border)] bg-[var(--background)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  autoComplete="off"
                />
              </div>
            )}
            <ul
              id={listboxId}
              role="listbox"
              className="overflow-y-auto py-1 flex-1"
            >
              {visibleOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[var(--text-muted)] select-none">
                  {emptyLabel ?? (allowCustom ? t("common.typeToAdd") : t("common.noResults"))}
                </li>
              ) : (
                visibleOptions.map((opt, i) => {
                  const active = i === highlight;
                  const selected = opt.value === value;
                  const isCustom = customOption && i === 0;
                  return (
                    <li
                      key={`${opt.value}-${i}`}
                      ref={(node) => {
                        optionRefs.current[i] = node;
                      }}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => commit(opt)}
                      className={`mx-1 px-2.5 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer select-none ${
                        opt.disabled
                          ? "opacity-40 cursor-not-allowed"
                          : active
                            ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                            : "text-[var(--text-primary)]"
                      }`}
                    >
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="flex-1 truncate">
                        {isCustom ? (
                          <>
                            <span className="text-[var(--text-muted)]">+ </span>
                            {opt.label}
                          </>
                        ) : (
                          opt.label
                        )}
                      </span>
                      {selected && !isCustom && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--accent)]">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={`${triggerBase} ${triggerState} ${SIZE_CLASSES[size]} ${className}`}
      >
        <span className={`flex-1 text-left truncate ${displayLabel ? "" : "text-[var(--text-muted)]"}`}>
          {displayLabel || placeholder || t("form.select")}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${
            highlightWhenSelected && isSelected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {menu}
    </>
  );
}
