import Link from "next/link";
import type { ReactNode } from "react";

type ContentArticleShellProps = {
  locale: string;
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  excerpt?: string | null;
  publishedLabel?: string | null;
  paragraphs: string[];
  children?: ReactNode;
};

function estimateReadingMinutes(paragraphs: string[]) {
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function getSectionMarkers(paragraphs: string[]) {
  const markers = paragraphs
    .map((paragraph, index) => ({ paragraph, index }))
    .filter((item) => item.index === 0 || item.index % 4 === 0)
    .slice(0, 6);

  return markers.length > 0 ? markers : paragraphs.slice(0, 1).map((paragraph, index) => ({ paragraph, index }));
}

export function ContentArticleShell({
  locale,
  backHref,
  backLabel,
  eyebrow,
  title,
  excerpt,
  publishedLabel,
  paragraphs,
  children,
}: ContentArticleShellProps) {
  const readingMinutes = estimateReadingMinutes(paragraphs);
  const markers = getSectionMarkers(paragraphs);
  const isEnglish = locale === "en";

  return (
    <article className="content-article-shell grid gap-6">
      {children}
      <section className="content-article-hero premium-card premium-card--interactive p-6 md:p-8">
        <Link href={backHref} className="text-sm font-black text-[#0f766e] hover:text-[#0b5f59]">
          {backLabel}
        </Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{eyebrow}</p>
        <h1 className="mt-2 max-w-5xl text-3xl font-black leading-tight text-[#152033] md:text-5xl">{title}</h1>
        {excerpt ? <p className="mt-4 max-w-4xl text-base font-bold leading-8 text-slate-600">{excerpt}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-slate-600">
          <span className="rounded-full border border-[#d1bfa7]/70 bg-[#fffaf6] px-3 py-1.5">
            {readingMinutes} {isEnglish ? "min read" : "dk okuma"}
          </span>
          {publishedLabel ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{publishedLabel}</span>
          ) : null}
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[#0f766e]">
            {isEnglish ? "Educational content" : "Eğitim amaçlı içerik"}
          </span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="content-article-body premium-card p-6 md:p-8">
          <div className="mx-auto grid max-w-4xl gap-5 text-[15px] leading-8 text-slate-700">
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph}`} id={`p-${index + 1}`} className="scroll-mt-36">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <aside className="content-article-sidebar premium-card p-5 lg:sticky lg:top-32 lg:self-start">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
            {isEnglish ? "Reading map" : "Okuma haritası"}
          </p>
          <div className="mt-4 grid gap-2">
            {markers.map((marker, markerIndex) => (
              <a
                key={`${marker.index}-${marker.paragraph}`}
                href={`#p-${marker.index + 1}`}
                className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-bold leading-5 text-slate-700 hover:border-[#0f766e] hover:text-[#0f766e]"
              >
                {markerIndex + 1}. {marker.paragraph.slice(0, 72)}
                {marker.paragraph.length > 72 ? "..." : ""}
              </a>
            ))}
          </div>
          <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4">
            <Link href={`/${locale}/islem-yap`} className="premium-action px-4 py-2 text-center text-xs font-black">
              {isEnglish ? "Try in virtual portfolio" : "Sanal portföyde dene"}
            </Link>
            <Link href={`/${locale}/ai-piyasa-asistani`} className="rounded-md border border-slate-800 bg-[#101827] px-4 py-2 text-center text-xs font-black text-white">
              {isEnglish ? "Review with AI" : "AI ile gözden geçir"}
            </Link>
          </div>
        </aside>
      </section>
    </article>
  );
}
