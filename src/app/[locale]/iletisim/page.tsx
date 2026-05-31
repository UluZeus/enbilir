import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).simplePages.contact;

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#152033]">{copy.supportTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{copy.supportBody}</p>
        <a href="https://wa.me/905322825555" target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-md bg-[#25d366] px-5 py-3 text-sm font-black text-white">
          {copy.cta}
        </a>
      </section>
    </div>
  );
}
