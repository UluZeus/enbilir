"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { logoutAction } from "@/lib/actions";

type HeaderLink = {
  href: string;
  label: string;
  tone?: "default" | "trade" | "ai" | "chat" | "macro" | "whatsapp";
};

type MobileHeaderMenuProps = {
  locale: Locale;
  brandLine: string;
  academyLabel: string;
  primaryLinks: HeaderLink[];
  productLinks: HeaderLink[];
  accountLinks: HeaderLink[];
  userLabel?: string;
  logoutLabel: string;
  supportLabel: string;
  tagline: string;
};

export function MobileHeaderMenu({
  locale,
  brandLine,
  academyLabel,
  primaryLinks,
  productLinks,
  accountLinks,
  userLabel,
  logoutLabel,
  supportLabel,
  tagline,
}: MobileHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mobile-site-header border-b border-[#d1bfa7]/30 bg-[#fffaf6]/92 px-4 py-3 shadow-lg backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/${locale}`} className="flex min-w-0 items-center gap-2.5" onClick={() => setIsOpen(false)}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d1bfa7]/50 bg-white shadow-sm">
            <Image src="/logo.svg" alt="Enbilir logo" width={32} height={32} className="h-8 w-8" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-black tracking-normal text-[#152033]">{brandLine}</span>
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#0f766e]">{academyLabel}</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {locales.map((language) => (
            <Link
              key={language}
              href={`/${language}`}
              aria-label={language === "tr" ? "Türkçe" : "English"}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-black ${
                language === locale ? "border-[#0f766e] bg-emerald-50 text-[#0f766e]" : "border-slate-200 bg-white text-slate-600"
              }`}
              onClick={() => setIsOpen(false)}
            >
              {language.toUpperCase()}
            </Link>
          ))}
          <button
            type="button"
            aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
            className="mobile-menu-button inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d1bfa7]/60 bg-white text-[#152033] shadow-sm"
          >
            <span className="grid gap-1.5">
              <span className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-bold text-slate-600">
        <span className="truncate">{supportLabel}</span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[#0f766e]">{locale === "tr" ? "Canlı" : "Live"}</span>
      </div>

      {isOpen ? (
        <div className="mobile-menu-panel mt-3 grid gap-3 rounded-2xl border border-[#d1bfa7]/38 bg-white/95 p-3 shadow-2xl">
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">{tagline}</p>
          <nav className="grid grid-cols-2 gap-2" aria-label="Ana menü">
            {primaryLinks.map((item) => (
              <MobileMenuLink key={item.href} item={item} onClick={() => setIsOpen(false)} />
            ))}
          </nav>
          <nav className="grid gap-2" aria-label="Ürün menüsü">
            {productLinks.map((item) => (
              <MobileMenuLink key={item.href} item={item} onClick={() => setIsOpen(false)} wide />
            ))}
          </nav>
          <div className="grid gap-2 border-t border-slate-100 pt-3">
            {userLabel ? (
              <>
                <Link
                  href={`/${locale}/panel`}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-[#0f766e]"
                  onClick={() => setIsOpen(false)}
                >
                  {userLabel}
                </Link>
                <form action={logoutAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <button className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-black text-slate-700">
                    {logoutLabel}
                  </button>
                </form>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {accountLinks.map((item) => (
                  <MobileMenuLink key={item.href} item={item} onClick={() => setIsOpen(false)} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileMenuLink({ item, wide = false, onClick }: { item: HeaderLink; wide?: boolean; onClick: () => void }) {
  const toneClass =
    item.tone === "trade"
      ? "border-emerald-200 bg-emerald-50 text-[#0f766e]"
      : item.tone === "ai"
        ? "border-slate-800 bg-[#101827] text-white"
        : item.tone === "chat"
          ? "border-cyan-200 bg-cyan-50 text-cyan-800"
          : item.tone === "macro"
            ? "border-red-200 bg-red-600 text-white"
            : item.tone === "whatsapp"
              ? "border-emerald-300 bg-[#25d366] text-white"
              : "border-slate-200 bg-white text-[#152033]";

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-black shadow-sm ${toneClass} ${wide ? "block" : ""}`}
    >
      {item.label}
    </Link>
  );
}
