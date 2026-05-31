import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";

export default async function EducationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).simplePages.education;

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      <section className="grid gap-4 md:grid-cols-3">
        {copy.modules.map((title) => (
          <div key={title} className="premium-card premium-card--interactive p-6 shadow-sm">
            <h2 className="text-xl font-black text-[#152033]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy.moduleBody}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
