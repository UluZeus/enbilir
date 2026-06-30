"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { getUsageGuideContent } from "@/lib/usage-guide-content";
import { UsageGuidePanel } from "@/components/usage-guide/UsageGuidePanel";

const storageKey = "enbilir-usage-guide-welcome:v1";

export function UsageGuideWelcomeModal({ locale }: { locale: Locale }) {
  const [isOpen, setIsOpen] = useState(false);
  const content = getUsageGuideContent(locale);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsOpen(window.localStorage.getItem(`${storageKey}:${locale}`) !== "1");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [locale]);

  function close() {
    window.localStorage.setItem(`${storageKey}:${locale}`, "1");
    setIsOpen(false);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="usage-guide-welcome-modal fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/62 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm md:py-8">
      <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <div className="bg-[#08111f] p-5 text-[#fffaf6] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#67e8f9]">{content.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-black text-[#fffaf6] md:text-4xl">{content.modalTitle}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#fffaf6]">{content.modalBody}</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={locale === "tr" ? "Kılavuzu kapat" : "Close guide"}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-xl font-black text-[#fffaf6] hover:bg-white/20"
            >
              x
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/kullanim-kilavuzu`} onClick={close} className="rounded-xl bg-[#67e8f9] px-5 py-3 text-center text-sm font-black text-[#08111f]">
              {content.startLabel}
            </Link>
            <button type="button" onClick={close} className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-[#fffaf6]">
              {content.closeLabel}
            </button>
          </div>
        </div>
        <div className="max-h-[64vh] overflow-y-auto p-4 md:p-5">
          <UsageGuidePanel locale={locale} compact />
        </div>
      </section>
    </div>
  );
}
