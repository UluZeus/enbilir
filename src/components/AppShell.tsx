import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getUiCopy } from "@/i18n/ui-copy";
import { logoutAction } from "@/lib/actions";
import { getDisplayName, getSessionUser } from "@/lib/auth";
import { getSiteVisualSettings, isVisualEnabled } from "@/lib/site-visual-settings";

const primaryNav = [
  { href: "", label: "home" },
  { href: "islem-yap", label: "trade" },
  { href: "egitim", label: "education" },
  { href: "liderlik-tablosu", label: "leaderboard" },
  { href: "ligler", label: "leagues" },
  { href: "topluluk", label: "community" },
  { href: "blog", label: "blog" },
  { href: "iletisim", label: "contact" },
] as const;

const accountNav = [
  { href: "giris", label: "login" },
  { href: "kayit", label: "register" },
] as const;

const flags = {
  tr: "flag-tr",
  en: "flag-gb",
} as const;

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
  const visualSettings = await getSiteVisualSettings();
  const animationsEnabled = isVisualEnabled(visualSettings, "animationsEnabled");
  const card3dEnabled = isVisualEnabled(visualSettings, "card3dEnabled");
  const whatsappUrl = "https://wa.me/905322825555";
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
      className={`visual-shell ${animationsEnabled ? "" : "visual-motion-off"} ${card3dEnabled ? "" : "visual-card3d-off"}`}
      style={shellStyle}
    >
      <AnimatedBackground settings={visualSettings} />
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="border-b border-slate-100 bg-[#101827] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-200">
              <span>{ui.appShell.support}</span>
              <span>{ui.appShell.tagline}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              {locales.map((language) => (
                <Link
                  key={language}
                  href={`/${language}`}
                  aria-label={dictionary.language[language]}
                  className={`flex h-8 w-10 items-center justify-center rounded-md border ${
                    language === locale ? "border-[#f5a623] bg-white" : "border-white/20 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <span className={`flag ${flags[language]}`} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between xl:gap-3 xl:px-5">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center xl:flex-1 xl:gap-3">
            <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2.5">
              <Image src="/logo.svg" alt="Enbilir logo" width={56} height={56} priority className="h-12 w-12 rounded-md xl:h-11 xl:w-11" />
              <span>
                <span className="block text-xl font-black tracking-normal text-[#152033] xl:text-lg 2xl:text-xl">enbilir.com</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f766e] 2xl:text-xs">{ui.appShell.academy}</span>
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-0.5 overflow-visible text-sm font-semibold text-slate-700 xl:flex-nowrap xl:whitespace-nowrap xl:text-[13px]">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={`/${locale}${item.href ? `/${item.href}` : ""}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 hover:bg-white/70 hover:text-[#0f766e] hover:shadow-sm 2xl:px-2.5 2xl:py-2"
                >
                  {item.label === "community" ? <CommunityIcon /> : null}
                  {dictionary.nav[item.label]}
                </Link>
              ))}
              <Link
                href={`/${locale}/ai-piyasa-asistani`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 hover:bg-white/70 hover:text-[#0f766e] hover:shadow-sm 2xl:px-2.5 2xl:py-2"
              >
                {ui.appShell.aiAssistant}
              </Link>
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
                  className="shrink-0 rounded-md border border-white/60 bg-white/70 px-2.5 py-1.5 font-semibold shadow-sm backdrop-blur hover:border-[#0f766e] hover:text-[#0f766e] 2xl:px-3 2xl:py-2"
                >
                  {dictionary.nav[item.label]}
                </Link>
              ))
            )}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className={`shrink-0 rounded-md bg-[#25d366] px-2.5 py-1.5 font-bold text-white shadow-sm hover:bg-[#1fb65a] 2xl:px-3 2xl:py-2 ${
                visualSettings.whatsappButtonVariant === "image" ? "inline-flex h-9 w-9 items-center justify-center px-0 2xl:h-10 2xl:w-10" : ""
              }`}
            >
              {visualSettings.whatsappButtonVariant === "image" ? <span className="text-xs font-black">WA</span> : dictionary.whatsapp}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-8 pb-24 md:pb-8">{children}</main>

      <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/60 bg-white/88 p-2 shadow-2xl backdrop-blur-xl">
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
