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
    <div className="content-hub-v3 grid gap-6">
      <section className="content-hub-search surface-card-v3 p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="section-eyebrow-v3">
              {isEnglish ? "Search the library" : "Kütüphanede ara"}
            </span>
            <span className="relative block">
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isEnglish ? "Balance sheet, crypto, AI assistant, virtual portfolio..." : "Bilanço, kripto, AI asistanı, sanal portföy..."}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
              />
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {(["ALL", ...kindOrder] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setActiveKind(kind)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  activeKind === kind
                    ? "border-teal-700 bg-teal-50 text-teal-900"
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
            <Link key={item.id} href={item.href} className="content-path-card-v3 p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">{item.kindLabel}</p>
              <h2 className="mt-2 text-lg font-bold leading-tight text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.excerpt}</p>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <article key={item.id} className="content-library-card-v3 flex min-h-64 flex-col p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="feature-icon-v3 feature-icon-v3--small" aria-hidden="true"><ContentKindIcon kind={item.kind} /></span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                {item.kindLabel}
              </span>
              {item.featured ? (
                <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800">
                  {isEnglish ? "Featured" : "Öne çıkan"}
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-bold leading-tight text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.excerpt}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
              <span className="text-xs font-bold text-slate-500">
                {estimateReadingMinutes(item)} {isEnglish ? "min read" : "dk okuma"}
                {item.publishedLabel ? ` · ${item.publishedLabel}` : ""}
              </span>
              <Link href={item.href} className="button-quiet-v3 px-4 py-2 text-xs font-bold">
                {isEnglish ? "Read" : "Oku"}
              </Link>
            </div>
          </article>
        ))}
      </section>

      {filteredItems.length === 0 ? (
        <section className="surface-card-v3 p-6 text-center">
          <h2 className="text-xl font-bold text-slate-950">{isEnglish ? "No matching content" : "Eşleşen içerik bulunamadı"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isEnglish ? "Try a broader concept or clear the filter." : "Daha geniş bir kavram deneyin veya filtreyi temizleyin."}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ContentKindIcon({ kind }: { kind: ContentHubItem["kind"] }) {
  if (kind === "BLOG") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6" /></svg>;
  if (kind === "EDUCATION") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 9 9-5 9 5-9 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18c5 0 2-10 8-11" /></svg>;
}
