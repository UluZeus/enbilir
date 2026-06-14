import { PageHeader } from "@/components/PageHeader";
import { ManagedContentList } from "@/components/ManagedContentList";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getManagedContentItems } from "@/lib/managed-content";

export default async function EducationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).simplePages.education;
  const educationItems = await getManagedContentItems({ type: "EDUCATION", locale });

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      {educationItems.length > 0 ? (
        <ManagedContentList
          items={educationItems}
          featuredLabel={locale === "en" ? "Featured" : "Öne çıkan"}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          {copy.modules.map((title) => (
            <div key={title} className="premium-card premium-card--interactive p-6 shadow-sm">
              <h2 className="text-xl font-black text-[#152033]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy.moduleBody}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
