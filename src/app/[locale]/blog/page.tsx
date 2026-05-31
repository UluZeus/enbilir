import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).simplePages.blog;

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      <section className="premium-card premium-card--interactive p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#152033]">{copy.emptyTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{copy.emptyBody}</p>
      </section>
    </div>
  );
}
