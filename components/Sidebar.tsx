"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { labelKey: "nav.dashboard", href: "/", icon: "📊" },
  { labelKey: "nav.recipes", href: "/recipes", icon: "🍽️" },
  { labelKey: "nav.videos", href: "/videos", icon: "🎬" },
  { labelKey: "nav.sevenPillars", href: "/seven-pillars", icon: "🏛️" },
  { labelKey: "nav.masterClasses", href: "/master-classes", icon: "🎓" },
  { labelKey: "nav.mealPlans", href: "/meal-plans", icon: "📅" },
  { labelKey: "nav.guiasPdf", href: "/guias-pdf", icon: "📄" },
  { labelKey: "nav.tienda", href: "/tienda", icon: "🛒" },
  { labelKey: "nav.higiene", href: "/higiene", icon: "🧴" },
  { labelKey: "nav.categories", href: "/categories", icon: "🏷️" },
  { labelKey: "nav.users", href: "/users", icon: "👥" },
  { labelKey: "nav.storage", href: "/storage", icon: "📦" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useTranslation();
  const { logout } = useAuth();

  return (
    <aside className="w-[272px] h-screen shrink-0 bg-[var(--sidebar-bg)] text-white flex flex-col overflow-y-auto">
      {/* Brand */}
      <div className="px-7 py-7">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="BTG" width={36} height={36} className="rounded-lg" />
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight leading-tight">{t("sidebar.title")}</h1>
            <p className="text-[11px] text-white/40 mt-0.5">{t("sidebar.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Language switcher */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-1 bg-white/[0.06] rounded-lg p-1">
          <button
            onClick={() => setLocale("es")}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition cursor-pointer ${
              locale === "es"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            ES
          </button>
          <button
            onClick={() => setLocale("en")}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition cursor-pointer ${
              locale === "en"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-[13px] rounded-lg transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white font-medium shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                  : "text-white/60 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5">
        <div className="mx-2 h-px bg-white/10 mb-3" />
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] rounded-lg text-white/60 hover:text-white hover:bg-red-500/20 transition-colors cursor-pointer"
        >
          <span className="text-base">🚪</span>
          <span>{t("auth.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
