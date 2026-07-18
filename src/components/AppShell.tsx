import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ActiveNavigationLink } from "@/components/ActiveNavigationLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileHeaderMenu } from "@/components/MobileHeaderMenu";
import { MobileDockVisibility } from "@/components/MobileDockVisibility";
import { MobileMenuDockButton } from "@/components/MobileMenuDockButton";
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

function CommunityIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
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
  const whatsappButtonIsImage = visualSettings.whatsappButtonVariant === "image";
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
  const productLinks: Array<{ href: string; label: string; tone: "trade" | "ai" | "chat" | "macro" | "vip" | "whatsapp" }> = sessionUser
    ? [
        ...productNav.map((item) => ({
          href: `/${locale}/${item.href}`,
          label: item.label === "ai" ? ui.appShell.aiAssistant : dictionary.nav[item.label],
          tone: item.tone,
        })),
        { href: `/${locale}/vip`, label: "VIP", tone: "vip" },
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
    "--visual-gradient-primary": visualSettings.gradientPrimary,
    "--visual-gradient-secondary": visualSettings.gradientSecondary,
    "--visual-accent": visualSettings.accentColor,
    "--visual-hero-image": imageVariable(visualSettings.heroBackgroundImageUrl),
    "--visual-home-overlay-image": imageVariable(visualSettings.homeOverlayImageUrl),
    "--visual-ad-image": imageVariable(visualSettings.adImageUrl),
  } as CSSProperties;

  return (
    <div
      className={`visual-shell enbilir-shell-v3 ${animationsEnabled ? "" : "visual-motion-off"} ${card3dEnabled ? "" : "visual-card3d-off"}`}
      style={shellStyle}
    >
      <AnimatedBackground settings={visualSettings} />
      <GuidedHelp
        locale={locale}
        userId={sessionUser?.id}
        progress={onboardingProgress}
      />
      <header className="site-header-v3 sticky top-0 z-50">
        <div className="site-desktop-header-v3 hidden xl:block">
          <div className="site-container-v3 flex h-[72px] items-center gap-5">
            <Link href={`/${locale}`} className="site-brand-v3 flex shrink-0 items-center gap-2.5" aria-label={dictionary.brand}>
              <Image src="/logo.svg" alt="" width={42} height={42} priority className="h-10 w-10 rounded-xl" />
              <span className="min-w-0">
                <span className="block text-[17px] font-bold leading-none text-white">enbilir.com</span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-200">{ui.appShell.academy}</span>
              </span>
            </Link>

            <nav className="site-primary-nav-v3 flex min-w-0 items-center gap-1" aria-label={locale === "tr" ? "Ana menü" : "Main menu"}>
              {visiblePrimaryNav.map((item) => (
                <ActiveNavigationLink
                  key={item.href}
                  href={`/${locale}${item.href ? `/${item.href}` : ""}`}
                  exact={item.href === ""}
                  className="site-nav-link-v3 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold"
                  activeClassName="site-nav-link-v3--active"
                  dataNavKey={item.label}
                >
                  {item.label === "community" ? <CommunityIcon /> : null}
                  {item.href === "baslangic" ? (locale === "tr" ? "Başlangıç" : "Start") : item.href === "ogren" ? (locale === "tr" ? "Öğren" : "Learn") : dictionary.nav[item.label]}
                </ActiveNavigationLink>
              ))}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="site-language-v3"><LanguageSwitcher locale={locale} labels={dictionary.language} /></div>
              {sessionUser ? (
                <>
                  <ActiveNavigationLink href={`/${locale}/panel`} className="site-user-link-v3 max-w-[190px] truncate px-3 py-2 text-sm font-semibold" activeClassName="site-user-link-v3--active">
                    {getDisplayName(sessionUser)}
                  </ActiveNavigationLink>
                  <form action={logoutAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <button className="site-header-button-v3 px-3 py-2 text-sm font-semibold">{ui.appShell.logout}</button>
                  </form>
                </>
              ) : (
                accountNav.map((item) => (
                  <ActiveNavigationLink
                    key={item.href}
                    href={`/${locale}/${item.href}`}
                    className={item.label === "register" ? "site-header-cta-v3 px-4 py-2.5 text-sm font-bold" : "site-header-button-v3 px-3 py-2 text-sm font-semibold"}
                    activeClassName="site-header-control-v3--active"
                  >
                    {dictionary.nav[item.label]}
                  </ActiveNavigationLink>
                ))
              )}
            </div>
          </div>

          <div className="site-product-bar-v3">
            <nav className="site-container-v3 site-product-bar-nav-v3 flex h-12 items-center gap-1.5 px-1" aria-label={locale === "tr" ? "Ürün ve araç menüsü" : "Products and tools"}>
              {productLinks.map((item) => item.href.startsWith("http") ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${item.label} (${locale === "tr" ? "yeni sekmede açılır" : "opens in a new tab"})`}
                  className="site-nav-link-v3 site-product-nav-link-v3 inline-flex items-center px-3 py-2 text-xs font-bold"
                  data-tone={item.tone}
                  data-variant={whatsappButtonIsImage ? "image" : "text"}
                >
                  {item.tone === "whatsapp" && whatsappButtonIsImage ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-[8px] font-black text-white">WA</span>
                      <span>{item.label}</span>
                    </span>
                  ) : item.label}
                </a>
              ) : (
                <ActiveNavigationLink
                  key={item.href}
                  href={item.href}
                  className="site-nav-link-v3 site-product-nav-link-v3 inline-flex items-center px-3 py-2 text-xs font-bold"
                  activeClassName="site-nav-link-v3--active"
                  dataProductTone={item.tone}
                >
                  {item.label}
                </ActiveNavigationLink>
              ))}
            </nav>
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

      <main className="site-main-v3 site-container-v3 w-full py-6 pb-28 md:py-8 md:pb-10">{children}</main>

      <MobileDockVisibility locale={locale}>
        <nav aria-label={locale === "tr" ? "Hızlı erişim" : "Quick access"} className={`mobile-dock-v3 grid ${sessionUser ? "grid-cols-4" : "grid-cols-3"} gap-1.5 p-1.5`}>
          {sessionUser ? (
            <>
          <ActiveNavigationLink
            href={`/${locale}/${onboardingProgress?.nextStep ? "baslangic" : "panel"}`}
            className="mobile-dock-link-v3 mobile-dock-link-v3--primary flex items-center justify-center px-2 py-3 text-center text-xs font-bold"
            activeClassName="ring-2 ring-[#0f766e] ring-offset-1"
          >
            {onboardingProgress?.nextStep ? (locale === "tr" ? "Başlangıç" : "Start") : (locale === "tr" ? "Panel" : "Dashboard")}
          </ActiveNavigationLink>
          <ActiveNavigationLink
            href={`/${locale}/islem-yap`}
            className="mobile-dock-link-v3 flex items-center justify-center px-2 py-3 text-center text-xs font-bold"
            activeClassName="border-[#0f766e] bg-emerald-50 ring-2 ring-[#0f766e] ring-offset-1"
          >
            {dictionary.nav.trade}
          </ActiveNavigationLink>
          <ActiveNavigationLink
            href={`/${locale}/ai-piyasa-asistani`}
            className="mobile-dock-link-v3 mobile-dock-link-v3--dark flex items-center justify-center px-2 py-3 text-center text-xs font-bold"
            activeClassName="ring-2 ring-cyan-400 ring-offset-1"
          >
            {ui.appShell.aiAssistant}
          </ActiveNavigationLink>
          <MobileMenuDockButton label={locale === "tr" ? "Menü" : "Menu"} />
            </>
          ) : (
            <>
              <ActiveNavigationLink href={`/${locale}/kayit`} className="mobile-dock-link-v3 mobile-dock-link-v3--primary flex items-center justify-center px-2 py-3 text-center text-xs font-bold">
                {dictionary.nav.register}
              </ActiveNavigationLink>
              <ActiveNavigationLink href={`/${locale}/ogren`} className="mobile-dock-link-v3 flex items-center justify-center px-2 py-3 text-center text-xs font-bold">
                {locale === "tr" ? "Öğren" : "Learn"}
              </ActiveNavigationLink>
              <MobileMenuDockButton label={locale === "tr" ? "Menü" : "Menu"} />
            </>
          )}
        </nav>
      </MobileDockVisibility>

      <footer className="site-footer-v3 mt-10">
        <div className="site-container-v3 grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.2fr]">
          <div>
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 text-white">
              <Image src="/logo.svg" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
              <span><strong className="block text-lg">enbilir.com</strong><span className="text-xs text-slate-400">{ui.appShell.academy}</span></span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">{ui.appShell.tagline}</p>
          </div>
          <nav className="site-footer-links-v3" aria-label={locale === "tr" ? "Ürünler" : "Products"}>
            <p className="site-footer-title-v3">{locale === "tr" ? "Ürünler" : "Products"}</p>
            <Link href={`/${locale}/islem-yap`}>{dictionary.nav.trade}</Link>
            <Link href={`/${locale}/ai-piyasa-asistani`}>{ui.appShell.aiAssistant}</Link>
            <Link href={`/${locale}/vip`}>VIP</Link>
            <Link href={macroReportHref}>{locale === "tr" ? "Makro rapor" : "Macro report"}</Link>
          </nav>
          <nav className="site-footer-links-v3" aria-label={locale === "tr" ? "Öğrenme" : "Learning"}>
            <p className="site-footer-title-v3">{locale === "tr" ? "Öğrenme" : "Learning"}</p>
            <Link href={`/${locale}/ogren`}>{locale === "tr" ? "Öğren" : "Learn"}</Link>
            <Link href={`/${locale}/egitim`}>{dictionary.nav.education}</Link>
            <Link href={`/${locale}/blog`}>{dictionary.nav.blog}</Link>
            <Link href={`/${locale}/kullanim-kilavuzu`}>{dictionary.nav.usageGuide}</Link>
          </nav>
          <nav className="site-footer-links-v3" aria-label={locale === "tr" ? "Destek ve yasal" : "Support and legal"}>
            <p className="site-footer-title-v3">{locale === "tr" ? "Destek ve yasal" : "Support & legal"}</p>
            <Link href={`/${locale}/iletisim`}>{dictionary.nav.contact}</Link>
            <a href={whatsappUrl} target="_blank" rel="noreferrer">{dictionary.whatsapp}</a>
            <span className="text-sm text-slate-400">{ui.appShell.support}</span>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <div className="site-container-v3 flex flex-col gap-4 py-5 text-xs leading-5 text-slate-400 lg:flex-row lg:items-center lg:justify-between">
            <span>© 2026 {dictionary.brand}. {locale === "tr" ? "Tüm hakları saklıdır." : "All rights reserved."}</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {legalLinks.map((item) => <Link key={item.href} href={`/${locale}/${item.href}`} className="hover:text-white">{ui.appShell.legalLinks[item.label]}</Link>)}
            </div>
          </div>
          <div className="site-container-v3 pb-6 text-xs leading-5 text-slate-500">{ui.appShell.footer}</div>
        </div>
      </footer>
    </div>
  );
}
