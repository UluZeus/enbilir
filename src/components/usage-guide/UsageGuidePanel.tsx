"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getUsageGuideContent } from "@/lib/usage-guide-content";

export function UsageGuidePanel({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const content = getUsageGuideContent(locale);

  return (
    <section className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[320px_1fr]"}`}>
      {!compact ? (
        <aside className="premium-card h-fit p-5 lg:sticky lg:top-32">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{content.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">{content.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{content.intro}</p>
          <div className="mt-5 grid gap-2">
            {content.steps.map((step) => (
              <a key={step.id} href={`#${step.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#152033] hover:border-[#0f766e] hover:text-[#0f766e]">
                {step.order} {step.title}
              </a>
            ))}
          </div>
        </aside>
      ) : null}

      <div className="grid gap-3">
        {content.steps.map((step, index) => (
          <details
            key={step.id}
            id={step.id}
            open={index === 0 && !compact}
            className="group scroll-mt-32 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <summary className="grid cursor-pointer gap-3 p-4 marker:content-none md:grid-cols-[64px_1fr_auto] md:items-center md:p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f766e] text-sm font-black text-white">{step.order}</span>
              <span>
                <span className="block text-lg font-black text-[#152033] md:text-xl">{step.title}</span>
                <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600">{step.summary}</span>
              </span>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-500 group-open:bg-[#152033] group-open:text-white">
                {locale === "tr" ? "Aç / Kapat" : "Open / Close"}
              </span>
            </summary>
            <div className="border-t border-slate-100 px-4 pb-5 pt-4 md:px-5">
              <div className="grid gap-3 text-sm leading-7 text-slate-700">
                {step.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {step.readItems ? (
                <div className="mt-5 rounded-2xl border border-[#d1bfa7]/45 bg-[#fffaf6] p-4">
                  <h3 className="text-base font-black text-[#152033]">{locale === "tr" ? "Hangi menüde ne okunmalı?" : "What to read, and where?"}</h3>
                  <div className="mt-3 grid gap-3">
                    {step.readItems.map((item) => (
                      <Link
                        key={`${item.menu}-${item.title}`}
                        href={`/${locale}${item.href}`}
                        className="rounded-xl border border-white bg-white p-3 shadow-sm hover:border-[#0f766e]"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">{item.menu}</p>
                        <p className="mt-1 text-sm font-black text-[#152033]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.note}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </details>
        ))}
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">{content.footerNote}</p>
      </div>
    </section>
  );
}
