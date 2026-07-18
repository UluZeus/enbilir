import type { Metadata } from "next";
import { RiskAppetiteTestClient } from "@/components/risk-test/RiskAppetiteTestClient";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
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
  const sessionUser = await getSessionUser();

  return (
    <div className="grid gap-5">
      <RiskAppetiteTestClient locale={locale} isSignedIn={Boolean(sessionUser)} />
    </div>
  );
}
