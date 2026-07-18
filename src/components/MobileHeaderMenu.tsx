"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { getLocalizedPath } from "@/i18n/localized-path";
import { logoutAction } from "@/lib/actions";

type HeaderLink = {
  href: string;
  label: string;
  tone?: "default" | "trade" | "ai" | "chat" | "macro" | "vip" | "whatsapp";
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
  const pathname = usePathname();
  const menuId = useId();
  const menuTitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const openMenu = () => setIsOpen(true);
    window.addEventListener("enbilir:open-mobile-menu", openMenu);
    return () =>
      window.removeEventListener("enbilir:open-mobile-menu", openMenu);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const frame = window.requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab" || !menuPanelRef.current) return;
      const focusable = Array.from(
        menuPanelRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled])",
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const isCurrent = (href: string) => {
    if (!href.startsWith("/")) return false;
    const hrefPath = href.split("?")[0];
    if (hrefPath === `/${locale}`) return pathname === hrefPath;
    return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  };

  const menuOverlay = isOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[120] bg-slate-950/55 p-3 pb-24 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsOpen(false);
          }}
        >
          <section
            ref={menuPanelRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={menuTitleId}
            className="mobile-menu-panel mx-auto flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#d1bfa7]/38 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#101827] px-4 py-3 text-white">
              <div>
                <p className="text-xs font-bold uppercase text-cyan-200">
                  {locale === "tr" ? "Gezinme" : "Navigation"}
                </p>
                <h2
                  id={menuTitleId}
                  className="mt-0.5 text-lg font-black text-white"
                >
                  {locale === "tr"
                    ? "Nereye gitmek istersin?"
                    : "Where would you like to go?"}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={locale === "tr" ? "Menüyü kapat" : "Close menu"}
                className="mobile-menu-close-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-xl font-black text-white"
              >
                ×
              </button>
            </div>
            <div className="grid gap-3 overflow-y-auto p-3">
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700">
                {tagline}
              </p>
              <nav
                className="grid grid-cols-2 gap-2"
                aria-label={locale === "tr" ? "Ana menü" : "Main menu"}
              >
                {primaryLinks.map((item) => (
                  <MobileMenuLink
                    key={item.href}
                    item={item}
                    current={isCurrent(item.href)}
                    onClick={() => setIsOpen(false)}
                  />
                ))}
              </nav>
              <nav
                className="grid gap-2"
                aria-label={locale === "tr" ? "Ürün menüsü" : "Product menu"}
              >
                {productLinks.map((item) => (
                  <MobileMenuLink
                    key={item.href}
                    item={item}
                    current={isCurrent(item.href)}
                    onClick={() => setIsOpen(false)}
                    wide
                  />
                ))}
              </nav>
              <div className="grid gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    window.dispatchEvent(new Event("enbilir:open-help"));
                  }}
                  className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-left text-sm font-black text-cyan-900"
                >
                  {locale === "tr" ? "Yardımı aç" : "Open help"}
                </button>
                {userLabel ? (
                  <>
                    <Link
                      href={`/${locale}/panel`}
                      aria-current={
                        isCurrent(`/${locale}/panel`) ? "page" : undefined
                      }
                      className={`rounded-xl border px-3 py-2 text-sm font-black ${isCurrent(`/${locale}/panel`) ? "border-[#0f766e] bg-emerald-100 text-[#075c56] ring-2 ring-emerald-200" : "border-emerald-200 bg-emerald-50 text-[#0f766e]"}`}
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
                      <MobileMenuLink
                        key={item.href}
                        item={item}
                        current={isCurrent(item.href)}
                        onClick={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="mobile-site-header mobile-site-header--advanced border-b border-[#d1bfa7]/30 bg-[#fffaf6]/92 px-4 py-3 shadow-lg backdrop-blur-xl xl:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/${locale}`}
            className="flex min-w-0 items-center gap-2.5"
            onClick={() => setIsOpen(false)}
          >
            <span className="mobile-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d1bfa7]/50 bg-white shadow-sm">
              <Image
                src="/logo.svg"
                alt="Enbilir logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black tracking-normal text-[#152033]">
                {brandLine}
              </span>
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#0f766e]">
                {academyLabel}
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {locales.map((language) => (
              <Link
                key={language}
                href={getLocalizedPath(pathname, language, locale)}
                aria-label={language === "tr" ? "Türkçe" : "English"}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-black ${
                  language === locale
                    ? "border-[#0f766e] bg-emerald-50 text-[#0f766e]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {language.toUpperCase()}
              </Link>
            ))}
            <button
              type="button"
              aria-label={
                isOpen
                  ? locale === "tr"
                    ? "Menüyü kapat"
                    : "Close menu"
                  : locale === "tr"
                    ? "Menüyü aç"
                    : "Open menu"
              }
              aria-expanded={isOpen}
              aria-controls={menuId}
              onClick={() => setIsOpen((current) => !current)}
              className="mobile-menu-button mobile-menu-button--advanced inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d1bfa7]/60 bg-white text-[#152033] shadow-sm"
            >
              <span className="grid gap-1.5">
                <span
                  className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "translate-y-2 rotate-45" : ""}`}
                />
                <span
                  className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "opacity-0" : ""}`}
                />
                <span
                  className={`block h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "-translate-y-2 -rotate-45" : ""}`}
                />
              </span>
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-bold text-slate-600">
          <span className="truncate">{supportLabel}</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[#0f766e]">
            {locale === "tr" ? "Canlı" : "Live"}
          </span>
        </div>
      </div>
      {menuOverlay}
    </>
  );
}

function MobileMenuLink({
  item,
  current = false,
  wide = false,
  onClick,
}: {
  item: HeaderLink;
  current?: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
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
      aria-current={current ? "page" : undefined}
      data-tone={item.tone ?? "default"}
      className={`rounded-xl border px-3 py-2 text-sm font-black shadow-sm ${toneClass} ${wide ? "block" : ""} ${current ? "ring-2 ring-[#0f766e] ring-offset-1" : ""}`}
    >
      {item.label}
    </Link>
  );
}
