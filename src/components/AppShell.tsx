import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ActiveNavigationLink } from "@/components/ActiveNavigationLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileHeaderMenu } from "@/components/MobileHeaderMenu";
import { MobileDockVisibility } from "@/components/MobileDockVisibility";
import { MobileMenuDockButton } from "@/components/MobileMenuDockButton";
import { SiteMotion } from "@/components/SiteMotion";
import { GuidedHelp } from "@/components/onboarding/GuidedHelp";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getUiCopy } from "@/i18n/ui-copy";
import { logoutAction } from "@/lib/actions";
import { getDisplayName, getSessionUser } from "@/lib/auth";
import { getOnboardingProgress } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { getSiteVisualSettings, isVisualEnabled } from "@/lib/site-visual-settings";

const primaryNav = [
  { href: "", label: "home" },
  { href: "baslangic", label: "usageGuide" },
  { href: "ogren", label: "contentHub" },
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

export async function AppShell({ children, locale }: AppShellProps) {
  const dictionary = getDictionary(locale);
  const ui = getUiCopy(locale);
  const sessionUser = await getSessionUser();
  const [latestMacroReport, visualSettings, onboardingProgress] = await Promise.all([
    prisma.aiMarketReport.findFirst({
      where: { scope: "GLOBAL" },
      orderBy: { generatedAt: "desc" },
      select: { id: true },
    }),
    getSiteVisualSettings(),
    sessionUser ? getOnboardingProgress(sessionUser.id) : Promise.resolve(undefined),
  ]);
  const animationsEnabled = isVisualEnabled(visualSettings, "animationsEnabled");
  const card3dEnabled = isVisualEnabled(visualSettings, "card3dEnabled");
  const whatsappUrl = "https://wa.me/905322825555";
  const macroReportHref = latestMacroReport
    ? `/${locale}/ai-piyasa-asistani/raporlar/${latestMacroReport.id}`
    : `/${locale}/ai-piyasa-asistani/raporlar`;
  const visiblePrimaryNav = primaryNav.filter((item) =>
    sessionUser ? ["", "baslangic", "ogren", "topluluk"].includes(item.href) : ["", "ogren", "iletisim"].includes(item.href),
  );
  const primaryLinks = visiblePrimaryNav.map((item) => ({
    href: `/${locale}${item.href ? `/${item.href}` : ""}`,
    label: item.href === "baslangic" ? (locale === "tr" ? "Başlangıç" : "Start") : item.href === "ogren" ? (locale === "tr" ? "Öğren" : "Learn") : dictionary.nav[item.label],
  }));
  const mobilePrimaryLinks = primaryLinks;
  const productLinks: Array<{ href: string; label: string; tone: "trade" | "ai" | "chat" | "macro" | "whatsapp" }> = sessionUser
    ? [
        ...productNav.map((item) => ({
          href: `/${locale}/${item.href}`,
          label: item.label === "ai" ? ui.appShell.aiAssistant : dictionary.nav[item.label],
          tone: item.tone,
        })),
        { href: macroReportHref, label: locale === "en" ? "MACRO REPORT" : "MAKRO RAPOR", tone: "macro" },
        { href: whatsappUrl, label: dictionary.whatsapp, tone: "whatsapp" },
      ]
    : [
        { href: `/${locale}/kayit`, label: locale === "tr" ? "1. Ücretsiz üye ol" : "1. Create free account", tone: "trade" },
        { href: `/${locale}/kullanim-kilavuzu`, label: locale === "tr" ? "2. Nasıl kullanılır?" : "2. How does it work?", tone: "ai" },
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
      <GuidedHelp
        locale={locale}
        userId={sessionUser?.id}
        progress={onboardingProgress}
      />
      <header className="premium-site-header premium-site-header--advanced sticky top-0 z-30">
        <div className="premium-finance-topbar hidden xl:block">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="premium-support-copy flex flex-1 flex-wrap items-center gap-x-6 gap-y-1.5 text-sm font-black leading-6 tracking-[0.01em] sm:text-base lg:text-[17px] xl:text-lg">
              <span className="font-black">{ui.appShell.support}</span>
              <span className="font-black">{ui.appShell.tagline}</span>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <span className="premium-topbar-signal hidden items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] xl:inline-flex">
                {locale === "tr" ? "Canlı öğrenme" : "Live learning"}
              </span>
              <LanguageSwitcher locale={locale} labels={dictionary.language} />
            </div>
          </div>
        </div>

        <div className="premium-finance-header mx-auto hidden w-full max-w-[92rem] items-center gap-3 px-5 py-3 xl:flex">
          <Link href={`/${locale}`} className="premium-brand-lockup flex w-[190px] shrink-0 items-center gap-2.5">
            <Image src="/logo.svg" alt="Enbilir logo" width={56} height={56} priority className="premium-brand-mark h-12 w-12 rounded-md xl:h-11 xl:w-11" />
            <span>
              <span className="block text-xl font-black tracking-normal text-[#152033] xl:text-lg 2xl:text-xl">enbilir.com</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f766e] 2xl:text-xs">{ui.appShell.academy}</span>
            </span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <nav className="premium-main-nav flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[13px] font-semibold">
              {visiblePrimaryNav.map((item) => (
                <ActiveNavigationLink
                  key={item.href}
                  href={`/${locale}${item.href ? `/${item.href}` : ""}`}
                  exact={item.href === ""}
                  className="premium-nav-link inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 2xl:px-2.5 2xl:py-2"
                  activeClassName="bg-white text-[#0f766e] shadow-sm ring-1 ring-[#0f766e]/30"
                  dataNavKey={item.label}
                >
                  {item.label === "community" ? <CommunityIcon /> : null}
                  {item.href === "baslangic" ? (locale === "tr" ? "Başlangıç" : "Start") : item.href === "ogren" ? (locale === "tr" ? "Öğren" : "Learn") : dictionary.nav[item.label]}
                </ActiveNavigationLink>
              ))}
            </nav>

            <nav className="premium-secondary-nav flex min-w-0 shrink items-center gap-1 overflow-hidden whitespace-nowrap text-[12px] font-semibold 2xl:gap-1.5 2xl:text-[13px]">
              {sessionUser ? productNav.map((item) => (
                <ActiveNavigationLink
                  key={item.href}
                  href={`/${locale}/${item.href}`}
                  className={`premium-product-nav premium-product-nav--${item.tone} inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-2 font-black 2xl:px-2.5`}
                  activeClassName="ring-2 ring-[#0f766e] ring-offset-2"
                  dataProductTone={item.tone}
                >
                  <span className="premium-product-nav-orb" aria-hidden="true" />
                  {item.label === "ai" ? ui.appShell.aiAssistant : dictionary.nav[item.label]}
                </ActiveNavigationLink>
              )) : (
                <>
                  <span className="shrink-0 text-[11px] font-black uppercase text-slate-300">{locale === "tr" ? "Yeni misin?" : "New here?"}</span>
                  <Link href={`/${locale}/kayit`} className="premium-product-nav premium-product-nav--trade inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-2 font-black">
                    <span className="premium-product-nav-orb" aria-hidden="true" />
                    {locale === "tr" ? "1. Ücretsiz üye ol" : "1. Create free account"}
                  </Link>
                  <Link href={`/${locale}/kullanim-kilavuzu`} className="premium-product-nav inline-flex shrink-0 items-center rounded-md px-2.5 py-2 font-black">
                    {locale === "tr" ? "2. Nasıl kullanılır?" : "2. How does it work?"}
                  </Link>
                </>
              )}
              {sessionUser ? (
                <>
                  <Link
                    href={macroReportHref}
                    className="macro-report-nav-link premium-nav-link inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-2 font-black text-white shadow-sm ring-1 ring-red-300/60 hover:text-white 2xl:px-2.5"
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
                    className={`whatsapp-link inline-flex shrink-0 items-center justify-center rounded-md bg-[#25d366] px-2 py-2 font-bold text-white shadow-sm hover:bg-[#1fb65a] 2xl:px-2.5 ${
                      visualSettings.whatsappButtonVariant === "image" ? "h-9 w-9 px-0 2xl:h-10 2xl:w-10" : ""
                    }`}
                  >
                    {visualSettings.whatsappButtonVariant === "image" ? <span className="text-xs font-black">WA</span> : dictionary.whatsapp}
                  </a>
                </>
              ) : null}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] 2xl:text-[13px]">
              {sessionUser ? (
                <div className="flex flex-wrap items-center gap-1.5 xl:flex-nowrap">
                  <ActiveNavigationLink
                    href={`/${locale}/panel`}
                    className="max-w-[170px] shrink-0 truncate rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 font-black text-[#0f766e] shadow-sm hover:border-[#0f766e] 2xl:max-w-[220px] 2xl:px-2.5 2xl:py-2"
                    activeClassName="border-[#0f766e] bg-emerald-100 ring-2 ring-emerald-200"
                  >
                    {locale === "tr" ? "Merhaba" : "Hello"}, {getDisplayName(sessionUser)}
                  </ActiveNavigationLink>
                  <form action={logoutAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <button className="shrink-0 rounded-md border border-white/60 bg-white/70 px-2 py-1.5 font-semibold shadow-sm backdrop-blur hover:border-[#0f766e] hover:text-[#0f766e] 2xl:px-2.5 2xl:py-2">
                      {ui.appShell.logout}
                    </button>
                  </form>
                </div>
              ) : (
                accountNav.map((item) => (
                  <ActiveNavigationLink
                    key={item.href}
                    href={`/${locale}/${item.href}`}
                    className={`premium-account-link ${item.label === "register" ? "premium-account-link--cta" : ""} shrink-0 rounded-md border border-white/60 bg-white/70 px-2.5 py-1.5 font-semibold shadow-sm backdrop-blur 2xl:px-3 2xl:py-2`}
                    activeClassName="ring-2 ring-[#0f766e] ring-offset-1"
                  >
                    {dictionary.nav[item.label]}
                  </ActiveNavigationLink>
                ))
              )}
            </div>
          </div>
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

      <MobileDockVisibility locale={locale}>
        <div className={`premium-mobile-dock grid ${sessionUser ? "grid-cols-4" : "grid-cols-3"} gap-2 rounded-2xl border border-white/60 bg-white/88 p-2 shadow-2xl backdrop-blur-xl`}>
          {sessionUser ? (
            <>
          <ActiveNavigationLink
            href={`/${locale}/${onboardingProgress?.nextStep ? "baslangic" : "panel"}`}
            className="premium-cta flex items-center justify-center px-3 py-3 text-center text-xs font-black"
            activeClassName="ring-2 ring-[#0f766e] ring-offset-1"
          >
            {onboardingProgress?.nextStep ? (locale === "tr" ? "Başlangıç" : "Start") : (locale === "tr" ? "Panel" : "Dashboard")}
          </ActiveNavigationLink>
          <ActiveNavigationLink
            href={`/${locale}/islem-yap`}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-[#152033]"
            activeClassName="border-[#0f766e] bg-emerald-50 ring-2 ring-[#0f766e] ring-offset-1"
          >
            {dictionary.nav.trade}
          </ActiveNavigationLink>
          <ActiveNavigationLink
            href={`/${locale}/ai-piyasa-asistani`}
            className="rounded-xl border border-slate-200 bg-[#101827] px-3 py-3 text-center text-xs font-black text-white"
            activeClassName="ring-2 ring-cyan-400 ring-offset-1"
          >
            {ui.appShell.aiAssistant}
          </ActiveNavigationLink>
          <MobileMenuDockButton label={locale === "tr" ? "Menü" : "Menu"} />
            </>
          ) : (
            <>
              <ActiveNavigationLink href={`/${locale}/kayit`} className="premium-cta flex items-center justify-center px-3 py-3 text-center text-xs font-black">
                {dictionary.nav.register}
              </ActiveNavigationLink>
              <ActiveNavigationLink href={`/${locale}/ogren`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-[#152033]">
                {locale === "tr" ? "Öğren" : "Learn"}
              </ActiveNavigationLink>
              <MobileMenuDockButton label={locale === "tr" ? "Menü" : "Menu"} />
            </>
          )}
        </div>
      </MobileDockVisibility>

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
