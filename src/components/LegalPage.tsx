import { getSafeLocale, type Locale } from "@/i18n/config";
import { SiteMotion } from "@/components/SiteMotion";

type LegalPageProps = {
  locale: Locale | string;
  title: string;
  updatedAt: string;
  sections: {
    heading: string;
    paragraphs: string[];
  }[];
};

export function LegalPage({ locale, title, updatedAt, sections }: LegalPageProps) {
  const safeLocale = getSafeLocale(locale);

  return (
    <article className="legal-page-modern rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div className="legal-page-modern-hero">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f766e]">{safeLocale === "en" ? "Legal information" : "Yasal bilgilendirme"}</p>
          <h1 className="mt-3 text-3xl font-black tracking-normal text-[#152033] sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-slate-500">{safeLocale === "en" ? "Last updated" : "Son güncelleme"}: {updatedAt}</p>
        </div>
        <div className="legal-page-motion" aria-hidden="true">
          <SiteMotion variant="dollar" />
        </div>
      </div>

      <div className="mt-8 grid gap-8">
        {sections.map((section) => (
          <section key={section.heading} className="grid gap-3">
            <h2 className="text-xl font-black text-[#152033]">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-slate-700">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
