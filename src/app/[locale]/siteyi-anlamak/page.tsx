import type { Metadata } from "next";
import { getSafeLocale } from "@/i18n/config";
import { getSiteGuideArticles } from "@/lib/site-guide-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/siteyi-anlamak", page: "siteGuide" });
}

export default async function SiteGuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const articles = getSiteGuideArticles(locale);

  return (
    <div className="grid gap-6">
      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {locale === "tr" ? "Siteyi Anlamak" : "Understanding the Site"}
        </p>
        <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-[#152033] md:text-4xl">
          {locale === "tr" ? "Bu siteden en çok nasıl yararlanırsınız öğrenmek için önce bu yazıları okuyunuz." : "Read these notes first to get the most value from this site."}
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
          {locale === "tr"
            ? "Bu bölüm blogdan ayrıdır. Buradaki yazılar, Enbilir'i bir web sayfası olarak değil; eğitim, sanal portföy, topluluk ve AI destekli piyasa okuryazarlığı sistemi olarak kullanmanız için hazırlanmıştır."
            : "This area is separate from the blog. These notes explain how to use Enbilir as a learning system built around education, virtual portfolios, community rhythm, and AI-supported market literacy."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <a key={article.id} href={`#${article.id}`} className="premium-card premium-card--interactive block p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{article.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{article.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
          </a>
        ))}
      </section>

      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {locale === "tr" ? "Görsel adım adım rehber" : "Visual step-by-step guide"}
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#152033]">
          {locale === "tr" ? "Enbilir'i her hafta aynı öğrenme döngüsüyle kullanın." : "Use Enbilir with the same learning loop every week."}
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {getVisualGuideSteps(locale).map((step) => (
            <div key={step.index} className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f766e] text-sm font-black text-white">
                {step.index}
              </span>
              <h3 className="mt-3 text-base font-black text-[#152033]">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6">
        {articles.map((article) => (
          <article key={article.id} id={article.id} className="premium-card p-6 scroll-mt-32">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{article.eyebrow}</p>
            <h2 className="mt-2 max-w-4xl text-2xl font-black leading-tight text-[#152033] md:text-3xl">{article.title}</h2>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-slate-600">{article.excerpt}</p>
            <div className="mt-5 grid max-w-4xl gap-4 text-[15px] leading-8 text-slate-700">
              {article.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function getVisualGuideSteps(locale: string) {
  if (locale === "en") {
    return [
      { index: "1", title: "Read", body: "Start from Education or Site Guide and build the concept language." },
      { index: "2", title: "Note", body: "Write why a virtual trade makes sense before placing it." },
      { index: "3", title: "Test", body: "Use the virtual portfolio without real-money pressure." },
      { index: "4", title: "Compare", body: "Review leaderboard, leagues, and community rhythm." },
      { index: "5", title: "Review", body: "Use AI and macro reports to ask better questions." },
    ];
  }

  return [
    { index: "1", title: "Oku", body: "Eğitim veya Siteyi Anlamak bölümünden kavram dilini kur." },
    { index: "2", title: "Not Al", body: "Sanal işlemden önce gerekçeni ve ters senaryonu yaz." },
    { index: "3", title: "Dene", body: "Gerçek para baskısı olmadan sanal portföyde uygula." },
    { index: "4", title: "Karşılaştır", body: "Liderlik, ligler ve topluluk ritmiyle sonucu incele." },
    { index: "5", title: "Gözden Geçir", body: "AI ve makro raporlarla daha iyi sorular sor." },
  ];
}
