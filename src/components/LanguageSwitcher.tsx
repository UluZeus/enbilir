"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";

export function LanguageSwitcher({ locale, labels }: { locale: Locale; labels: Record<Locale, string> }) {
  const pathname = usePathname();

  const localizedPath = (language: Locale) => {
    const path = pathname.replace(/^\/(tr|en)(?=\/|$)/, `/${language}`);
    return path === pathname && !pathname.startsWith(`/${locale}`) ? `/${language}` : path;
  };

  return (
    <div className="flex items-center gap-2" aria-label={locale === "tr" ? "Dil seçimi" : "Language selection"}>
      {locales.map((language) => (
        <Link
          key={language}
          href={localizedPath(language)}
          hrefLang={language}
          aria-label={labels[language]}
          aria-current={language === locale ? "page" : undefined}
          className={`language-switch flex h-9 w-12 items-center justify-center rounded-xl border ${
            language === locale ? "border-[#d1bfa7] bg-white/18" : "border-white/20 bg-white/8 hover:bg-white/16"
          }`}
        >
          <FlagIcon locale={language} />
        </Link>
      ))}
    </div>
  );
}

function FlagIcon({ locale }: { locale: Locale }) {
  if (locale === "tr") {
    return (
      <svg aria-hidden="true" viewBox="0 0 60 40" className="language-flag">
        <rect width="60" height="40" rx="6" fill="#e30a17" />
        <circle cx="25" cy="20" r="10.8" fill="#fff" />
        <circle cx="29" cy="20" r="8.7" fill="#e30a17" />
        <path fill="#fff" d="m40.6 12.5 1.74 5.36h5.64l-4.56 3.31 1.74 5.36-4.56-3.31-4.56 3.31 1.74-5.36-4.56-3.31h5.64z" transform="rotate(-18 40.6 20)" />
        <rect width="60" height="40" rx="6" fill="none" stroke="rgba(255,255,255,.38)" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 60 40" className="language-flag">
      <defs>
        <clipPath id="language-gb-flag-clip">
          <rect width="60" height="40" rx="6" />
        </clipPath>
      </defs>
      <g clipPath="url(#language-gb-flag-clip)">
        <rect width="60" height="40" fill="#012169" />
        <path stroke="#fff" strokeWidth="8" d="M0 0 60 40M60 0 0 40" />
        <path stroke="#c8102e" strokeWidth="4.5" d="M0 0 60 40M60 0 0 40" />
        <path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" />
        <path stroke="#c8102e" strokeWidth="8" d="M30 0v40M0 20h60" />
        <rect width="60" height="40" fill="none" stroke="rgba(255,255,255,.42)" />
      </g>
    </svg>
  );
}
