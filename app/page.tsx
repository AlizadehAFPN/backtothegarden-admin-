"use client";

import { useCollection } from "@/lib/useCollection";
import { useTranslation } from "@/i18n/LanguageContext";

interface StatCardProps {
  label: string;
  count: number;
  icon: string;
  href: string;
  color: string;
}

const CARD_COLORS = [
  "from-emerald-500/10 to-emerald-500/5 border-emerald-200/60",
  "from-violet-500/10 to-violet-500/5 border-violet-200/60",
  "from-amber-500/10 to-amber-500/5 border-amber-200/60",
  "from-sky-500/10 to-sky-500/5 border-sky-200/60",
  "from-rose-500/10 to-rose-500/5 border-rose-200/60",
  "from-indigo-500/10 to-indigo-500/5 border-indigo-200/60",
  "from-orange-500/10 to-orange-500/5 border-orange-200/60",
  "from-teal-500/10 to-teal-500/5 border-teal-200/60",
  "from-blue-500/10 to-blue-500/5 border-blue-200/60",
  "from-fuchsia-500/10 to-fuchsia-500/5 border-fuchsia-200/60",
];

function StatCard({ label, count, icon, href, color }: StatCardProps) {
  return (
    <a
      href={href}
      className={`group bg-gradient-to-br ${color} border rounded-xl p-5 hover:shadow-[var(--shadow-md)] transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight">{count}</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1 font-medium">{label}</p>
        </div>
        <span className="text-2xl opacity-80 group-hover:scale-110 transition-transform">{icon}</span>
      </div>
    </a>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data: recipes, loading: l1 } = useCollection("Recetas");
  const { data: videos, loading: l2 } = useCollection("VideosExclusivos");
  const { data: pillars, loading: l3 } = useCollection("sevenPillars");
  const { data: masterClasses, loading: l4 } = useCollection("MasterClasses");
  const { data: mealPlans, loading: l5 } = useCollection("MealPlans");
  const { data: guias, loading: l6 } = useCollection("GuiasPDF");
  const { data: tienda, loading: l7 } = useCollection("Tienda");
  const { data: higiene, loading: l8 } = useCollection("Higiene");
  const { data: users, loading: l9 } = useCollection("Users");
  const { data: categories, loading: l10 } = useCollection("categories");

  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  const stats: StatCardProps[] = [
    { label: t("nav.recipes"), count: recipes.length, icon: "🍽️", href: "/recipes", color: CARD_COLORS[0] },
    { label: t("nav.videos"), count: videos.length, icon: "🎬", href: "/videos", color: CARD_COLORS[1] },
    { label: t("nav.sevenPillars"), count: pillars.length, icon: "🏛️", href: "/seven-pillars", color: CARD_COLORS[2] },
    { label: t("nav.masterClasses"), count: masterClasses.length, icon: "🎓", href: "/master-classes", color: CARD_COLORS[3] },
    { label: t("nav.mealPlans"), count: mealPlans.length, icon: "📅", href: "/meal-plans", color: CARD_COLORS[4] },
    { label: t("nav.guiasPdf"), count: guias.length, icon: "📄", href: "/guias-pdf", color: CARD_COLORS[5] },
    { label: t("nav.tienda"), count: tienda.length, icon: "🛒", href: "/tienda", color: CARD_COLORS[6] },
    { label: t("nav.higiene"), count: higiene.length, icon: "🧴", href: "/higiene", color: CARD_COLORS[7] },
    { label: t("nav.users"), count: users.length, icon: "👥", href: "/users", color: CARD_COLORS[8] },
    { label: t("nav.categories"), count: categories.length, icon: "🏷️", href: "/categories", color: CARD_COLORS[9] },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t("dashboard.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}
