import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getSafeLocale } from "@/i18n/config";
import { getLegalPageContent } from "@/lib/legal-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/acik-riza", page: "legal", keywords: ["açık rıza", "veri işleme izni"] });
}

export default async function ExplicitConsentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const content = getLegalPageContent(locale, "explicitConsent");

  return <LegalPage locale={locale} title={content.title} updatedAt={content.updatedAt} sections={content.sections} />;
}
