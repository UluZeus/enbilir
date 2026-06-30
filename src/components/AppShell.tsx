import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LeagueRequiredGate } from "@/components/LeagueRequiredGate";
import { MobileHeaderMenu } from "@/components/MobileHeaderMenu";
import { SiteMotion } from "@/components/SiteMotion";
import { WeeklyWinnersModal } from "@/components/WeeklyWinnersModal";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getUiCopy } from "@/i18n/ui-copy";
import { logoutAction } from "@/lib/actions";
import { getDisplayName, getSessionUser } from "@/lib/auth";
import { getDefaultLeagueOptions } from "@/lib/default-leagues";
import { prisma } from "@/lib/prisma";
import { getSiteVisualSettings, isVisualEnabled } from "@/lib/site-visual-settings";
import { getWeeklyCompetitionSummary } from "@/lib/weekly-competition-summary";

const primaryNav = [
  { href: "", label: "home" },
  { href: "icerik-merkezi", label: "contentHub" },
  { href: "ligler", label: "leagues" },
  { href: "liderlik-tablosu", label: "leaderboard" },
  { href: "topluluk", label: "community" },
  { href: "iletisim", label: "contact" },
] as const;

const accountNav = [
  { href: "giris", label: "login" },
  { href: "kayit", label: "register" },
] as const;

const productNav = [
  { href: "islem-yap", label: "trade", tone: "trade" },
  { href: "ai-piyasa-asistani", label: "ai", tone: "ai" },
] as const;

const legalLinks = [
  { href: "kvkk", label: "kvkk" },
  { href: "acik-riza", label: "consent" },
  { href: "cerez-politikasi", label: "cookies" },
  { href: "kullanim-sartlari", label: "terms" },
  { href: "yatirim-tavsiyesi-degildir", label: "disclaimer" },
] as const;

type AppShellProps = {
  children: ReactNode;
  locale: Locale;
};

function imageVariable(url: string) {
  return url ? `url("${url.replaceAll('"', "%22")}")` : "none";
}

function CommunityIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FlagIcon({ locale }: { locale: Locale }) {
  if (locale === "tr") {
    return (
      <svg aria-hidden="true" viewBox="0 0 60 40" className="language-flag">
        <defs>
          <linearGradient id="tr-flag-shine" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ff3340" />
            <stop offset="0.55" stopColor="#e30a17" />
            <stop offset="1" stopColor="#b90712" />
          </linearGradient>
        </defs>
        <rect width="60" height="40" rx="6" fill="url(#tr-flag-shine)" />
        <circle cx="25" cy="20" r="10.8" fill="#fff" />
        <circle cx="29" cy="20" r="8.7" fill="#e30a17" />
        <path
          fill="#fff"
          d="m40.6 12.5 1.74 5.36h5.64l-4.56 3.31 1.74 5.36-4.56-3.31-4.56 3.31 1.74-5.36-4.56-3.31h5.64z"
          transform="rotate(-18 40.6 20)"
        />
        <rect width="60" height="40" rx="6" fill="none" stroke="rgba(255,255,255,.38)" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 60 40" className="language-flag">
      <defs>
        <clipPath id="gb-flag-clip">
          <rect width="60" height="40" rx="6" />
        </clipPath>
        <linearGradient id="gb-flag-shine" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#173f8a" />
          <stop offset="0.58" stopColor="#012169" />
          <stop offset="1" stopColor="#001544" />
        </linearGradient>
      </defs>
      <g clipPath="url(#gb-flag-clip)">
        <rect width="60" height="40" fill="url(#gb-flag-shine)" />
        <path stroke="#fff" strokeWidth="8" d="M0 0 60 40M60 0 0 40" />
        <path stroke="#c8102e" strokeWidth="4.5" d="M0 0 60 40M60 0 0 40" />
        <path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" />
        <path stroke="#c8102e" strokeWidth="8" d="M30 0v40M0 20h60" />
        <rect width="60" height="40" fill="none" stroke="rgba(255,255,255,.42)" />
      </g>
    </svg>
  );
}

export async function AppShell({ children, locale }: AppShellProps) {
  const dictionary = getDictionary(locale);
  const ui = getUiCopy(locale);
  const sessionUser = await getSessionUser();
  const [latestMacroReport, visualSettings, defaultLeagueOptions, weeklySummary, userLeagueCount] = await Promise.all([
    prisma.aiMarketReport.findFirst({
      where: { scope: "GLOBAL" },
      orderBy: { generatedAt: "desc" },
      select: { id: true },
    }),
    getSiteVisualSettings(),
    getDefaultLeagueOptions(locale),
    getWeeklyCompetitionSummary(locale, sessionUser?.id),
    sessionUser ? prisma.leagueMembership.count({ where: { userId: sessionUser.id } }) : Promise.resolve(null),
  ]);
  const animationsEnabled = isVisualEnabled(visualSettings, "animationsEnabled");
  const card3dEnabled = isVisualEnabled(visualSettings, "card3dEnabled");
  const whatsappUrl = "https://wa.me/905322825555";
  const macroReportHref = latestMacroReport
    ? `/${locale}/ai-piyasa-asistani/raporlar/${latestMacroReport.id}`
    : `/${locale}/ai-piyasa-asistani/raporlar`;
  const primaryLinks = primaryNav.map((item) => ({
    href: `/${locale}${item.href ? `/${item.href}` : ""}`,
    label: dictionary.nav[item.label],
  }));
  const mobilePrimaryLinks = [
    ...primaryLinks,
    { href: `/${locale}/blog`, label: dictionary.nav.blog },
    { href: `/${locale}/egitim`, label: dictionary.nav.education },
    { href: `/${locale}/siteyi-anlamak`, label: dictionary.nav.siteGuide },
  ];
  const productLinks: Array<{ href: string; label: string; tone: "trade" | "ai" | "chat" | "macro" | "whatsapp" }> = [
    ...productNav.map((item) => ({
      href: `/${locale}/${item.href}`,
      label: item.label === "ai" ? ui.appShell.aiAssistant : dictionary.nav[item.label],
      tone: item.tone,
    })),
    { href: `/${locale}/sohbet`, label: dictionary.nav.chat, tone: "chat" },
    { href: macroReportHref, label: locale === "en" ? "MACRO REPORT" : "MAKRO RAPOR", tone: "macro" },
    { href: whatsappUrl, label: dictionary.whatsapp, tone: "whatsapp" },
  ];
  const accountLinks = accountNav.map((item) => ({
    href: `/${locale}/${item.href}`,
    label: dictionary.nav[item.label],
  }));
  const shellStyle = {
    "--visual-gradient-primary": "#d1bfa7",
    "--visual-gradient-secondary": "#bd8c7d",
    "--visual-accent": "#bd8c7d",
    "--visual-hero-image": imageVariable(visualSettings.heroBackgroundImageUrl),
    "--visual-home-overlay-image": imageVariable(visualSettings.homeOverlayImageUrl),
    "--visual-ad-image": imageVariable(visualSettings.adImageUrl),
  } as CSSProperties;

  return (
    <div
      className={`visual-shell site-modern-academy ${animationsEnabled ? "" : "visual-motion-off"} ${card3dEnabled ? "" : "visual-card3d-off"}`}
      style={shellStyle}
    >
      <AnimatedBackground settings={visualSettings} />
      <div className="site-ambient-layer" aria-hidden="true">
        <SiteMotion variant="macro" className="site-ambient-motion site-ambient-motion--one" />
        <SiteMotion variant="network" className="site-ambient-motion site-ambient-motion--two" />
        <SiteMotion variant="trend" className="site-ambient-motion site-ambient-motion--three" />
      </div>
      {sessionUser && userLeagueCount === 0 ? <LeagueRequiredGate locale={locale} leagues={defaultLeagueOptions} /> : null}
      <WeeklyWinnersModal locale={locale} isSignedIn={Boolean(sessionUser)} summary={weeklySummary} />
      <header className="premium-site-header premium-site-header--advanced sticky top-0 z-30">
        <div className="premium-finance-topbar hidden md:block">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="premium-support-copy flex flex-1 flex-wrap items-center gap-x-6 gap-y-1.5 text-sm font-black leading-6 tracking-[0.01em] sm:text-base lg:text-[17px] xl:text-lg">
              <span className="font-black">{ui.appShell.support}</span>
              <span className="font-black">{ui.appShell.tagline}</span>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <span className="premium-topbar-signal hidden items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] xl:inline-flex">
                {locale === "tr" ? "Canlı öğrenme" : "Live learning"}
              </span>
              {locales.map((language) => (
                <Link
                  key={language}
                  href={`/${language}`}
                  aria-label={dictionary.language[language]}
                  className={`language-switch flex h-9 w-12 items-center justify-center rounded-xl border ${
                    language === locale ? "border-[#d1bfa7] bg-white/18" : "border-white/20 bg-white/8 hover:bg-white/16"
                  }`}
                >
                  <FlagIcon locale={language} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="premium-finance-header mx-auto hidden w-full max-w-[92rem] gap-x-4 gap-y-3 px-4 py-3 md:grid lg:grid-cols-[178px_minmax(0,1fr)] lg:items-center xl:grid-cols-[190px_minmax(0,1fr)] xl:px-5">
          <Link href={`/${locale}`} className="premium-brand-lockup flex shrink-0 items-center gap-2.5 lg:row-span-2 lg:self-center">
            <Image src="/logo.svg" alt="Enbilir logo" width={56} height={56} priority className="premium-brand-mark h-12 w-12 rounded-md xl:h-11 xl:w-11" />
            <span>
              <span className="block text-xl font-black tracking-normal text-[#152033] xl:text-lg 2xl:text-xl">enbilir.com</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f766e] 2xl:text-xs">{ui.appShell.academy}</span>
            </span>
          </Link>

          <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center xl:flex-1 xl:gap-3">
              <nav className="premium-main-nav flex flex-wrap items-center gap-0.5 overflow-visible text-sm font-semibold xl:flex-nowrap xl:whitespace-nowrap xl:text-[13px]">
                {primaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={`/${locale}${item.href ? `/${item.href}` : ""}`}
                    className="premium-nav-link inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 2xl:px-2.5 2xl:py-2"
                    data-nav-key={item.label}
                  >
                    {item.label === "community" ? <CommunityIcon /> : null}
                    {dictionary.nav[item.label]}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-sm xl:shrink-0 xl:flex-nowrap xl:whitespace-nowrap xl:text-[13px]">
              {sessionUser ? (
                <div className="flex flex-wrap items-center gap-1.5 xl:flex-nowrap">
                  <Link
                    href={`/${locale}/panel`}
                    className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-black text-[#0f766e] shadow-sm hover:border-[#0f766e] 2xl:px-3 2xl:py-2"
                  >
                    {locale === "tr" ? "Merhaba" : "Hello"}, {getDisplayName(sessionUser)}
                  </Link>
                  <form action={logoutAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <button className="shrink-0 rounded-md border border-white/60 bg-white/70 px-2.5 py-1.5 font-semibold shadow-sm backdrop-blur hover:border-[#0f766e] hover:text-[#0f766e] 2xl:px-3 2xl:py-2">
                      {ui.appShell.logout}
                    </button>
                  </form>
                </div>
              ) : (
                accountNav.map((item) => (
                  <Link
                    key={item.href}
                    href={`/${locale}/${item.href}`}
                    className={`premium-account-link ${item.label === "register" ? "premium-account-link--cta" : ""} shrink-0 rounded-md border border-white/60 bg-white/70 px-2.5 py-1.5 font-semibold shadow-sm backdrop-blur 2xl:px-3 2xl:py-2`}
                  >
                    {dictionary.nav[item.label]}
                  </Link>
                ))
              )}
            </div>
          </div>

          <nav className="premium-secondary-nav flex flex-wrap items-center justify-start gap-2 border-t border-[#d1bfa7]/35 pt-3 text-sm font-semibold lg:col-start-2 xl:text-[13px]">
            {productNav.map((item) => (
              <Link
                key={item.href}
                href={`/${locale}/${item.href}`}
                className={`premium-product-nav premium-product-nav--${item.tone} inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-2 font-black`}
                data-product-tone={item.tone}
              >
                <span className="premium-product-nav-orb" aria-hidden="true" />
                {item.label === "ai" ? ui.appShell.aiAssistant : dictionary.nav[item.label]}
              </Link>
            ))}
            <Link
              href={`/${locale}/sohbet`}
              className="premium-product-nav premium-product-nav--chat inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-2 font-black"
              data-product-tone="chat"
            >
              <span className="premium-product-nav-orb" aria-hidden="true" />
              {dictionary.nav.chat}
            </Link>
            <Link
              href={macroReportHref}
              className="macro-report-nav-link premium-nav-link inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-2 font-black text-white shadow-sm ring-1 ring-red-300/60 hover:text-white"
              style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
              data-product-tone="macro"
            >
              <span className="premium-product-nav-orb" aria-hidden="true" />
              {locale === "en" ? "MACRO REPORT" : "MAKRO RAPOR"}
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className={`whatsapp-link inline-flex shrink-0 items-center justify-center rounded-md bg-[#25d366] px-3 py-2 font-bold text-white shadow-sm hover:bg-[#1fb65a] ${
                visualSettings.whatsappButtonVariant === "image" ? "inline-flex h-9 w-9 items-center justify-center px-0 2xl:h-10 2xl:w-10" : ""
              }`}
            >
              {visualSettings.whatsappButtonVariant === "image" ? <span className="text-xs font-black">WA</span> : dictionary.whatsapp}
            </a>
          </nav>
        </div>
        <MobileHeaderMenu
          locale={locale}
          brandLine="enbilir.com"
          academyLabel={ui.appShell.academy}
          primaryLinks={mobilePrimaryLinks}
          productLinks={productLinks}
          accountLinks={accountLinks}
          userLabel={sessionUser ? `${locale === "tr" ? "Merhaba" : "Hello"}, ${getDisplayName(sessionUser)}` : undefined}
          logoutLabel={ui.appShell.logout}
          supportLabel={ui.appShell.support}
          tagline={ui.appShell.tagline}
        />
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-8 pb-24 md:pb-8">{children}</main>

      <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
        <div className="premium-mobile-dock grid grid-cols-4 gap-2 rounded-2xl border border-white/60 bg-white/88 p-2 shadow-2xl backdrop-blur-xl">
          <Link
            href={`/${locale}/${sessionUser ? "panel" : "kayit"}`}
            className="premium-cta flex items-center justify-center px-3 py-3 text-center text-xs font-black"
          >
            {sessionUser ? (locale === "tr" ? "Panel" : "Dashboard") : dictionary.nav.register}
          </Link>
          <Link
            href={`/${locale}/islem-yap`}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-[#152033]"
          >
            {dictionary.nav.trade}
          </Link>
          <Link
            href={`/${locale}/ai-piyasa-asistani`}
            className="rounded-xl border border-slate-200 bg-[#101827] px-3 py-3 text-center text-xs font-black text-white"
          >
            {ui.appShell.aiAssistant}
          </Link>
          <Link
            href={macroReportHref}
            className="macro-report-nav-link rounded-xl px-3 py-3 text-center text-xs font-black text-white"
          >
            {locale === "tr" ? "Makro" : "Macro"}
          </Link>
        </div>
      </div>

      <footer className="mt-8 border-t border-white/60 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <span>(c) 2026 {dictionary.brand}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {legalLinks.map((item) => (
              <Link key={item.href} href={`/${locale}/${item.href}`} className="hover:text-[#0f766e]">
                {ui.appShell.legalLinks[item.label]}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-5 py-4 text-xs leading-6 text-slate-500">{ui.appShell.footer}</div>
        </div>
      </footer>
    </div>
  );
}
