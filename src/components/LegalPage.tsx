import { getSafeLocale, type Locale } from "@/i18n/config";
import { LegalTableOfContents } from "@/components/LegalTableOfContents";
import { SiteMotion } from "@/components/SiteMotion";
import type { LegalPageContent } from "@/lib/legal-content";

type LegalPageProps = LegalPageContent & {
  locale: Locale | string;
};

export function LegalPage({ locale, title, updatedAt, intro, highlights, sections, references }: LegalPageProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = safeLocale === "en"
    ? {
        eyebrow: "Legal information",
        updated: "Last updated",
        contents: "On this page",
        references: "Official references",
        operator: "Platform operator and data controller",
        service: "Service",
        address: "Registered address",
        tax: "Tax office / number",
        mersis: "MERSIS number",
        contact: "Company and legal contact",
        support: "Enbilir support",
        languageNote: "The English version is provided for convenience. For matters governed by Turkish law, the Turkish text prevails in case of inconsistency.",
      }
    : {
        eyebrow: "Yasal bilgilendirme",
        updated: "Son güncelleme",
        contents: "Bu sayfada",
        references: "Resmi dayanaklar",
        operator: "Platform işletmecisi ve veri sorumlusu",
        service: "Hizmet",
        address: "Merkez adresi",
        tax: "Vergi dairesi / numarası",
        mersis: "MERSİS numarası",
        contact: "Şirket ve hukuk iletişimi",
        support: "Enbilir desteği",
        languageNote: "İngilizce metin kolaylık amacıyla sunulur. Türk hukukunun uygulandığı konularda bir uyumsuzluk olması halinde Türkçe metin esas alınır.",
      };

  return (
    <article className="legal-page-modern rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-10">
      <header className="legal-page-modern-hero">
        <div className="legal-page-hero-copy">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[#0f766e]" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0f766e]">{copy.eyebrow}</p>
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-normal text-[#152033] sm:text-[2.75rem]">{title}</h1>
          <p className="mt-5 max-w-4xl text-base leading-8 text-slate-700 sm:text-lg">{intro}</p>
          <p className="mt-6 inline-flex border-t border-slate-300 pt-3 text-sm font-bold text-slate-500">{copy.updated}: {updatedAt}</p>
        </div>
        <div className="legal-page-motion" aria-hidden="true">
          <SiteMotion variant="dollar" />
        </div>
      </header>

      <div className="mt-8 grid border-y border-slate-200 py-5 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
        {highlights.map((highlight) => (
          <p key={highlight} className="px-0 py-2 text-sm font-bold leading-6 text-[#243247] sm:px-5 sm:first:pl-0 sm:last:pr-0">
            {highlight}
          </p>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
        <LegalTableOfContents label={copy.contents} headings={sections.map((section) => section.heading)} />

        <div className="min-w-0">
          {sections.map((section, index) => (
            <section id={`legal-section-${index + 1}`} key={section.heading} className="scroll-mt-28 border-b border-slate-200 py-8 first:pt-0 last:border-b-0">
              <div className="flex items-start gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#0f766e] text-sm font-black text-white" aria-hidden="true">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black leading-8 text-[#152033] sm:text-2xl">{section.heading}</h2>
                  <div className="mt-4 grid gap-4">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-[0.95rem] leading-7 text-slate-700">{paragraph}</p>
                    ))}
                    {section.bullets?.length ? (
                      <ul className="grid gap-3 pl-5 text-[0.95rem] leading-7 text-slate-700 marker:text-[#0f766e]">
                        {section.bullets.map((bullet) => <li key={bullet} className="pl-1">{bullet}</li>)}
                      </ul>
                    ) : null}
                    {section.note ? (
                      <p className="border-l-4 border-[#0f766e] bg-[#eef8f6] px-4 py-3 text-sm font-semibold leading-6 text-[#243247]">{section.note}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      {references.length ? (
        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-black text-[#152033]">{copy.references}</h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {references.map((reference) => (
              <li key={reference.href}>
                <a href={reference.href} target="_blank" rel="noreferrer" className="text-sm font-semibold leading-6 text-[#0f766e] underline decoration-[#0f766e]/30 underline-offset-4 hover:decoration-[#0f766e]">
                  {reference.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-10 border-y border-slate-200 bg-slate-50 px-0 py-6 sm:px-6">
        <dl className="grid gap-5 text-sm leading-6 sm:grid-cols-2">
          <div className="sm:col-span-2"><dt className="font-black text-[#152033]">{copy.operator}</dt><dd className="mt-1 text-slate-700">Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi</dd></div>
          <div><dt className="font-black text-[#152033]">{copy.service}</dt><dd className="mt-1 text-slate-700">Enbilir · <a className="font-bold text-[#0f766e]" href="https://enbilir.com">enbilir.com</a></dd></div>
          <div><dt className="font-black text-[#152033]">{copy.address}</dt><dd className="mt-1 text-slate-700">Altıntepe Mahallesi, İstasyon Yolu Sokak, No: 3/1, Maltepe / İstanbul</dd></div>
          <div><dt className="font-black text-[#152033]">{copy.tax}</dt><dd className="mt-1 text-slate-700">Küçükyalı Vergi Dairesi · 887 134 99 08</dd></div>
          <div><dt className="font-black text-[#152033]">{copy.mersis}</dt><dd className="mt-1 text-slate-700">0887134990800001</dd></div>
          <div><dt className="font-black text-[#152033]">{copy.contact}</dt><dd className="mt-1 text-slate-700"><a className="font-bold text-[#0f766e]" href="mailto:info@ultraakil.com">info@ultraakil.com</a> · <a className="font-bold text-[#0f766e]" href="tel:+902164164444">0216 416 44 44</a></dd></div>
          <div><dt className="font-black text-[#152033]">{copy.support}</dt><dd className="mt-1"><a className="font-bold text-[#0f766e]" href="tel:+908502205092">0850 220 50 92</a></dd></div>
        </dl>
        {safeLocale === "en" ? <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">{copy.languageNote}</p> : null}
      </footer>
    </article>
  );
}
