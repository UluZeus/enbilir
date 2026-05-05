import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSiteVisualSettings, isVisualEnabled } from "@/lib/site-visual-settings";

const primaryNav = [
  { href: "", label: "home" },
  { href: "islem-yap", label: "trade" },
  { href: "egitim", label: "education" },
  { href: "liderlik-tablosu", label: "leaderboard" },
  { href: "ligler", label: "leagues" },
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
  { href: "kvkk", label: "KVKK Aydınlatma Metni" },
  { href: "acik-riza", label: "Açık Rıza Metni" },
  { href: "cerez-politikasi", label: "Çerez Politikası" },
  { href: "kullanim-sartlari", label: "Kullanım Şartları" },
  { href: "yatirim-tavsiyesi-degildir", label: "Yatırım Tavsiyesi Değildir" },
] as const;

type AppShellProps = {
  children: ReactNode;
  locale: Locale;
};

function imageVariable(url: string) {
  return url ? `url("${url.replaceAll('"', "%22")}")` : "none";
}

export async function AppShell({ children, locale }: AppShellProps) {
  const dictionary = getDictionary(locale);
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
              <span>Destek: 0850 000 00 00</span>
              <span>Piyasa takibi ve eğitim tek platformda</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              {locales.map((language) => (
                <Link
                  key={language}
                  href={`/${language}`}
                  aria-label={dictionary.language[language]}
                  className={`flex h-8 w-10 items-center justify-center rounded-md border ${
                    language === locale
                      ? "border-[#f5a623] bg-white"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <span className={`flag ${flags[language]}`} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Enbilir logo"
                width={56}
                height={56}
                priority
                className="h-14 w-14 rounded-md"
              />
              <span>
                <span className="block text-2xl font-black tracking-normal text-[#152033]">enbilir.com</span>
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                  Piyasa Akademisi
                </span>
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-700">
              {primaryNav.map((item) => (
                <Link
                key={item.href}
                href={`/${locale}${item.href ? `/${item.href}` : ""}`}
                  className="rounded-md px-3 py-2 hover:bg-white/70 hover:text-[#0f766e] hover:shadow-sm"
                >
                  {dictionary.nav[item.label]}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {accountNav.map((item) => (
              <Link
                key={item.href}
                href={`/${locale}/${item.href}`}
                className="rounded-md border border-white/60 bg-white/70 px-3 py-2 font-semibold shadow-sm backdrop-blur hover:border-[#0f766e] hover:text-[#0f766e]"
              >
                {dictionary.nav[item.label]}
              </Link>
            ))}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className={`rounded-md bg-[#25d366] px-3 py-2 font-bold text-white shadow-sm hover:bg-[#1fb65a] ${
                visualSettings.whatsappButtonVariant === "image" ? "inline-flex h-10 w-10 items-center justify-center px-0" : ""
              }`}
            >
              {visualSettings.whatsappButtonVariant === "image" ? <span className="text-xs font-black">WA</span> : dictionary.whatsapp}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-8">{children}</main>

      <footer className="mt-8 border-t border-white/60 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <span>(c) 2026 {dictionary.brand}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {legalLinks.map((item) => (
              <Link key={item.href} href={`/${locale}/${item.href}`} className="hover:text-[#0f766e]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-5 py-4 text-xs leading-6 text-slate-500">
            Enbilir gerçek para ile işlem yaptırmaz. Platform sanal portföy yarışması, eğitim ve finansal okuryazarlık
            amacı taşır; içerikler yatırım danışmanlığı kapsamında değildir.
          </div>
        </div>
      </footer>
    </div>
  );
}
