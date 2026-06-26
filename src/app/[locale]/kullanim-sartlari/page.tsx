import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getSafeLocale } from "@/i18n/config";
import { getLegalPageContent } from "@/lib/legal-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/kullanim-sartlari", page: "legal", keywords: ["kullanım şartları", "terms of use"] });
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const content = getLegalPageContent(locale, "terms");

  return <LegalPage locale={locale} title={content.title} updatedAt={content.updatedAt} sections={content.sections} />;
}
