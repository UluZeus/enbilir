import type { Metadata } from "next";
import { UsageGuidePanel } from "@/components/usage-guide/UsageGuidePanel";
import { SiteMotion } from "@/components/SiteMotion";
import { getSafeLocale } from "@/i18n/config";
import { getUsageGuideContent } from "@/lib/usage-guide-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);

  return buildPageMetadata({
    locale,
    path: "/kullanim-kilavuzu",
    page: "usageGuide",
    keywords: [
      "Enbilir kullanım kılavuzu",
      "sanal portföy rehberi",
      "risk iştahı testi nasıl kullanılır",
      "finansal okuryazarlık kullanım rehberi",
      "rapor okuma rehberi",
    ],
  });
}

export default async function UsageGuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const content = getUsageGuideContent(locale);

  return (
    <div className="grid gap-6">
      <section className="premium-card premium-card--interactive p-6 md:p-8">
        <div className="site-page-hero-grid">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{content.pageLabel}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-[#152033] md:text-5xl">{content.title}</h1>
            <p className="mt-4 max-w-4xl text-sm font-bold leading-7 text-slate-600 md:text-base md:leading-8">{content.subtitle}</p>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{content.intro}</p>
          </div>
          <div className="site-page-hero-motion">
            <SiteMotion variant="path" />
          </div>
        </div>
      </section>

      <UsageGuidePanel locale={locale} />
    </div>
  );
}
