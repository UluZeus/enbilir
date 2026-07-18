import Link from "next/link";
import type { ReactNode } from "react";
import { ReadingProgress } from "@/components/content/ReadingProgress";
import { SiteMotion, type SiteMotionVariant } from "@/components/SiteMotion";

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
  const motionVariant = getArticleMotionVariant(`${eyebrow} ${title}`);

  return (
    <article className="content-article-shell content-article-v3 grid gap-6" data-reading-article>
      <ReadingProgress label={isEnglish ? "Article reading progress" : "Makale okuma ilerlemesi"} />
      {children}
      <section className="content-article-hero article-hero-v3 p-6 md:p-8 lg:p-10">
        <div className="content-article-hero-grid">
          <div>
            <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900">
              <span aria-hidden="true">←</span> {backLabel}
            </Link>
            <p className="section-eyebrow-v3 mt-6">{eyebrow}</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-[1.08] tracking-[-0.04em] text-slate-950 md:text-5xl">{title}</h1>
            {excerpt ? <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-slate-600 md:text-lg">{excerpt}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
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
          </div>
          <div className="content-article-motion">
            <SiteMotion variant={motionVariant} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_272px] lg:items-start">
        <div className="content-article-body article-body-v3 p-6 md:p-10">
          <div className="mx-auto grid max-w-[760px] gap-6 text-[17px] leading-[1.82] text-slate-700">
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph}`} id={`p-${index + 1}`} className="scroll-mt-36">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <aside className="content-article-sidebar article-sidebar-v3 p-5 lg:sticky lg:top-24 lg:self-start">
          <p className="section-eyebrow-v3">
            {isEnglish ? "Reading map" : "Okuma haritası"}
          </p>
          <nav className="mt-4 grid gap-2" aria-label={isEnglish ? "Article sections" : "Makale bölümleri"}>
            {markers.map((marker, markerIndex) => (
              <a
                key={`${marker.index}-${marker.paragraph}`}
                href={`#p-${marker.index + 1}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold leading-5 text-slate-700 hover:border-teal-700 hover:text-teal-800"
              >
                <span className="mr-1 text-teal-700">0{markerIndex + 1}</span> {marker.paragraph.slice(0, 58)}
                {marker.paragraph.length > 58 ? "…" : ""}
              </a>
            ))}
          </nav>
          <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4">
            <Link href={`/${locale}/islem-yap`} className="button-primary-v3 px-4 py-2.5 text-center text-xs font-bold">
              {isEnglish ? "Try in virtual portfolio" : "Sanal portföyde dene"}
            </Link>
            <Link href={`/${locale}/ai-piyasa-asistani`} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-center text-xs font-bold text-white">
              {isEnglish ? "Review with AI" : "AI ile gözden geçir"}
            </Link>
          </div>
        </aside>
      </section>
    </article>
  );
}

function getArticleMotionVariant(text: string): SiteMotionVariant {
  const normalized = text.toLocaleLowerCase("tr-TR");

  if (normalized.includes("kripto") || normalized.includes("crypto") || normalized.includes("bitcoin")) return "crypto";
  if (normalized.includes("makro") || normalized.includes("dolar") || normalized.includes("rezerv")) return "macro";
  if (normalized.includes("bilanço") || normalized.includes("finansal tablo")) return "compare";
  if (normalized.includes("risk") || normalized.includes("psikoloji")) return "pulse";
  if (normalized.includes("topluluk") || normalized.includes("lig")) return "community";
  if (normalized.includes("site")) return "path";

  return "trend";
}
