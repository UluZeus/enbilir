"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ContentHubItem = {
  id: string;
  kind: "BLOG" | "EDUCATION" | "SITE_GUIDE";
  kindLabel: string;
  href: string;
  title: string;
  excerpt: string;
  body: string;
  featured: boolean;
  publishedLabel: string | null;
};

type ContentHubExplorerProps = {
  locale: string;
  items: ContentHubItem[];
};

const kindOrder: ContentHubItem["kind"][] = ["SITE_GUIDE", "EDUCATION", "BLOG"];

function estimateReadingMinutes(item: ContentHubItem) {
  const words = `${item.title} ${item.excerpt} ${item.body}`.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function ContentHubExplorer({ locale, items }: ContentHubExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeKind, setActiveKind] = useState<ContentHubItem["kind"] | "ALL">("ALL");
  const isEnglish = locale === "en";
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const kindMatches = activeKind === "ALL" || item.kind === activeKind;

      if (!kindMatches) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = `${item.title} ${item.excerpt} ${item.body}`.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US");
      return searchable.includes(normalizedQuery);
    });
  }, [activeKind, items, locale, normalizedQuery]);

  const counts = useMemo(() => {
    return items.reduce<Record<ContentHubItem["kind"] | "ALL", number>>(
      (acc, item) => {
        acc.ALL += 1;
        acc[item.kind] += 1;
        return acc;
      },
      { ALL: 0, SITE_GUIDE: 0, EDUCATION: 0, BLOG: 0 },
    );
  }, [items]);

  const kindLabels = {
    ALL: isEnglish ? "All" : "Tümü",
    SITE_GUIDE: isEnglish ? "Understand the Site" : "Siteyi Anlamak",
    EDUCATION: isEnglish ? "Education" : "Eğitim",
    BLOG: isEnglish ? "Blog" : "Blog",
  } as const;

  const readingPath = kindOrder
    .map((kind) => items.find((item) => item.kind === kind))
    .filter((item): item is ContentHubItem => Boolean(item));

  return (
    <div className="grid gap-6">
      <section className="content-hub-search premium-card p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
              {isEnglish ? "Search the library" : "Kütüphanede ara"}
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isEnglish ? "Balance sheet, crypto, AI assistant, virtual portfolio..." : "Bilanço, kripto, AI asistanı, sanal portföy..."}
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#152033] outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["ALL", ...kindOrder] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setActiveKind(kind)}
                className={`rounded-xl border px-3 py-2 text-xs font-black ${
                  activeKind === kind
                    ? "border-[#0f766e] bg-emerald-50 text-[#0f766e]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {kindLabels[kind]} ({counts[kind]})
              </button>
            ))}
          </div>
        </div>
      </section>

      {readingPath.length > 0 ? (
        <section className="content-hub-path grid gap-3 md:grid-cols-3">
          {readingPath.map((item, index) => (
            <Link key={item.id} href={item.href} className="premium-card premium-card--interactive p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0f766e] text-sm font-black text-white">
                {index + 1}
              </span>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">{item.kindLabel}</p>
              <h2 className="mt-2 text-lg font-black leading-tight text-[#152033]">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.excerpt}</p>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <article key={item.id} className="premium-card premium-card--interactive p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#d1bfa7]/70 bg-[#fffaf6] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#8a6a5d]">
                {item.kindLabel}
              </span>
              {item.featured ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#0f766e]">
                  {isEnglish ? "Featured" : "Öne çıkan"}
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-black leading-tight text-[#152033]">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.excerpt}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500">
                {estimateReadingMinutes(item)} {isEnglish ? "min read" : "dk okuma"}
                {item.publishedLabel ? ` · ${item.publishedLabel}` : ""}
              </span>
              <Link href={item.href} className="premium-action px-4 py-2 text-xs font-black">
                {isEnglish ? "Read" : "Oku"}
              </Link>
            </div>
          </article>
        ))}
      </section>

      {filteredItems.length === 0 ? (
        <section className="premium-card p-6 text-center">
          <h2 className="text-xl font-black text-[#152033]">{isEnglish ? "No matching content" : "Eşleşen içerik bulunamadı"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isEnglish ? "Try a broader concept or clear the filter." : "Daha geniş bir kavram deneyin veya filtreyi temizleyin."}
          </p>
        </section>
      ) : null}
    </div>
  );
}
