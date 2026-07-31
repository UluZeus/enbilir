"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

const communityRoutes = [
  { segment: "topluluk", tr: "Üyeler", en: "Members" },
  { segment: "ligler", tr: "Ligler", en: "Leagues" },
  { segment: "liderlik-tablosu", tr: "Yarışma Sonuçları", en: "Competition results" },
  { segment: "haftalik-liderler", tr: "Haftalık Arşiv", en: "Weekly archive" },
] as const;

type CommunitySectionNavigationProps = {
  locale: Locale;
};

export function CommunitySectionNavigation({ locale }: CommunitySectionNavigationProps) {
  const pathname = usePathname();
  const routes = communityRoutes.map((route) => ({
    href: `/${locale}/${route.segment}`,
    label: route[locale],
  }));
  const activeRoute = routes.find(
    (route) => pathname === route.href || pathname.startsWith(`${route.href}/`),
  );

  if (!activeRoute) {
    return null;
  }

  return (
    <nav
      aria-label={locale === "tr" ? "Topluluk bölümü" : "Community section"}
      className="mb-5 w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 p-1.5 shadow-sm backdrop-blur"
    >
      <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <ul className="flex min-w-max gap-1">
          {routes.map((route) => {
            const isCurrent = route.href === activeRoute.href;

            return (
              <li key={route.href}>
                <Link
                  href={route.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                    isCurrent
                      ? "bg-[#0f766e] text-white shadow-sm"
                      : "text-slate-600 hover:bg-teal-50 hover:text-teal-800"
                  }`}
                >
                  {route.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
