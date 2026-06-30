import type { Metadata } from "next";
import { RiskAppetiteTestClient } from "@/components/risk-test/RiskAppetiteTestClient";
import { SiteMotion } from "@/components/SiteMotion";
import { getSafeLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({
    locale,
    path: "/risk-istahi-testi",
    page: "riskTest",
    keywords: ["risk iştahı testi", "risk profili", "sanal portföy risk testi", "yatırım psikolojisi", "risk farkındalığı"],
  });
}

export default async function RiskAppetiteTestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const isEnglish = locale === "en";

  return (
    <div className="grid gap-6">
      <section className="premium-card p-6 md:p-8">
        <div className="site-page-hero-grid">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
              {isEnglish ? "Financial literacy and risk awareness" : "Finansal okuryazarlık ve risk farkındalığı"}
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-[#152033] md:text-5xl">
              {isEnglish ? "Risk Appetite Test" : "Risk İştahı Testi"}
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 md:text-base md:leading-8">
              {isEnglish
                ? "Discover how you make decisions in markets, how you react to uncertainty, and which risk profile can guide your virtual portfolio practice."
                : "Piyasalarda nasıl karar verdiğini, belirsizliğe nasıl tepki verdiğini ve sanal portföyünü hangi risk profiliyle yönetmen gerektiğini keşfet."}
            </p>
          </div>
          <div className="site-page-hero-motion">
            <SiteMotion variant="pulse" />
          </div>
        </div>
      </section>

      <RiskAppetiteTestClient locale={locale} />
    </div>
  );
}
