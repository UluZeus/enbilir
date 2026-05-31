import { LegalPage } from "@/components/LegalPage";
import { getSafeLocale } from "@/i18n/config";
import { getLegalPageContent } from "@/lib/legal-content";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const content = getLegalPageContent(locale, "terms");

  return <LegalPage locale={locale} title={content.title} updatedAt={content.updatedAt} sections={content.sections} />;
}
