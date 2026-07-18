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
          className="mobile-menu-overlay-v3 fixed inset-0 z-[120] bg-slate-950/70 p-3 backdrop-blur-sm"
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
            className="mobile-menu-panel mobile-menu-panel-v3 mx-auto flex max-h-full w-full max-w-lg flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b1320] px-4 py-4 text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200">
                  {locale === "tr" ? "Gezinme" : "Navigation"}
                </p>
                <h2
                  id={menuTitleId}
                  className="mt-1 text-lg font-bold text-white"
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
                className="mobile-menu-close-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-semibold text-white"
              >
                ×
              </button>
            </div>
            <div className="grid gap-4 overflow-y-auto p-4">
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium leading-5 text-slate-700">
                {tagline}
              </p>
              <p className="mobile-menu-section-label-v3">{locale === "tr" ? "Keşfet" : "Explore"}</p>
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
              <p className="mobile-menu-section-label-v3">{locale === "tr" ? "Ürünler ve araçlar" : "Products and tools"}</p>
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
                  className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-left text-sm font-bold text-teal-900"
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
                      className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${isCurrent(`/${locale}/panel`) ? "border-teal-700 bg-teal-100 text-teal-950 ring-2 ring-teal-200" : "border-teal-200 bg-teal-50 text-teal-900"}`}
                      onClick={() => setIsOpen(false)}
                    >
                      {userLabel}
                    </Link>
                    <form action={logoutAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <button className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700">
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
                <p className="px-1 pt-1 text-xs leading-5 text-slate-500">{supportLabel}</p>
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="mobile-site-header mobile-site-header--advanced site-mobile-header-v3 px-4 xl:hidden">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link
            href={`/${locale}`}
            className="flex min-w-0 items-center gap-2.5"
            onClick={() => setIsOpen(false)}
          >
            <span className="mobile-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-sm">
              <Image
                src="/logo.svg"
                alt="Enbilir logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold tracking-normal text-white">
                {brandLine}
              </span>
              <span className="mt-1 block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-teal-200">
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
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-[11px] font-bold ${
                  language === locale
                    ? "border-teal-300/60 bg-teal-300/15 text-teal-100"
                    : "border-white/15 bg-white/5 text-slate-300"
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
              className="mobile-menu-button mobile-menu-button--advanced inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-sm"
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
      ? "border-teal-200 bg-teal-50 text-teal-900"
      : item.tone === "ai"
        ? "border-slate-800 bg-[#101827] text-white"
        : item.tone === "chat"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : item.tone === "macro"
            ? "border-indigo-200 bg-indigo-50 text-indigo-950"
            : item.tone === "vip"
              ? "border-amber-300 bg-[#111827] text-amber-200"
            : item.tone === "whatsapp"
              ? "border-slate-200 bg-white text-slate-800"
              : "border-slate-200 bg-white text-[#152033]";

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      data-tone={item.tone ?? "default"}
      className={`rounded-xl border px-3 py-2.5 text-sm font-bold shadow-sm ${toneClass} ${wide ? "block" : ""} ${current ? "ring-2 ring-teal-700 ring-offset-1" : ""}`}
    >
      {item.label}
    </Link>
  );
}
