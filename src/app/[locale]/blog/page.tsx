import { PageHeader } from "@/components/PageHeader";
import { ManagedContentList } from "@/components/ManagedContentList";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getManagedContentItems } from "@/lib/managed-content";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).simplePages.blog;
  const posts = await getManagedContentItems({ type: "BLOG", locale });
  const editorialPillars = getEditorialPillars(locale);
  const starterPosts = getStarterPosts(locale);
  const contentCalendar = getContentCalendar(locale);
  const evergreenNotes = getEvergreenNotes(locale);

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      <section className="grid gap-4 md:grid-cols-3">
        {editorialPillars.map((pillar) => (
          <article key={pillar.title} className="premium-card premium-card--interactive p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{pillar.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{pillar.body}</p>
          </article>
        ))}
      </section>
      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {locale === "tr" ? "Haftalık içerik takvimi" : "Weekly content calendar"}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {contentCalendar.map((item) => (
            <div key={item.day} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
              <p className="text-sm font-black text-[#152033]">{item.day}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {evergreenNotes.map((item) => (
          <article key={item.title} className="premium-card premium-card--interactive p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{item.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{item.title}</h2>
            <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600">
              {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </article>
        ))}
      </section>
      {posts.length > 0 ? (
        <ManagedContentList
          items={posts}
          emptyTitle={copy.emptyTitle}
          emptyBody={copy.emptyBody}
          featuredLabel={locale === "en" ? "Featured" : "Öne çıkan"}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {starterPosts.map((post) => (
            <article key={post.title} className="premium-card premium-card--interactive p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{post.tag}</p>
              <h2 className="mt-2 text-xl font-black text-[#152033]">{post.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
              <div className="mt-4 rounded-xl bg-[#f8fafc] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{locale === "tr" ? "SEO anahtarları" : "SEO keywords"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{post.keywords.join(" • ")}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function getEvergreenNotes(locale: string) {
  if (locale === "en") {
    return [
      {
        eyebrow: "Evergreen",
        title: "Why does financial literacy need repetition?",
        paragraphs: [
          "Financial literacy is not built by reading one article once. It grows when users see the same concepts in different formats: article, visual card, portfolio action, league discussion, and AI summary.",
          "That is why content on Enbilir should not feel isolated. A blog post should feed an education card, an education card should support a league discussion, and that discussion should bring the user back to the portfolio screen.",
        ],
      },
      {
        eyebrow: "Evergreen",
        title: "Why can community-based learning outperform solo learning?",
        paragraphs: [
          "People tend to stay more consistent when there is a visible group rhythm around them. Community-based learning adds accountability, reflection, and motivation without needing real-money pressure.",
          "For Rotary-oriented groups, this is especially powerful because the platform becomes not only a personal tool but also a recurring meeting topic and a shared learning environment.",
        ],
      },
    ] as const;
  }

  return [
    {
      eyebrow: "Kalıcı İçerik",
      title: "Finansal okuryazarlık neden tekrar ister?",
      paragraphs: [
        "Finansal okuryazarlık tek bir yazıyı bir kez okuyarak kurulmaz. Aynı kavramlar farklı biçimlerde görüldükçe güçlenir: makale, görsel kart, portföy aksiyonu, lig içi tartışma ve AI özeti.",
        "Bu yüzden Enbilir’de içerik birbirinden kopuk durmamalıdır. Blog yazısı eğitim kartını beslemeli, eğitim kartı lig içi konuşmayı desteklemeli, o konuşma da kullanıcıyı yeniden portföy ekranına getirmelidir.",
      ],
    },
    {
      eyebrow: "Kalıcı İçerik",
      title: "Topluluk temelli öğrenme neden tek başına öğrenmeden güçlü olabilir?",
      paragraphs: [
        "İnsanlar çevrelerinde görünür bir grup ritmi olduğunda daha istikrarlı kalır. Topluluk temelli öğrenme; gerçek para baskısına ihtiyaç duymadan sorumluluk hissi, değerlendirme ve motivasyon üretir.",
        "Rotary odaklı gruplar için bu etki daha da güçlüdür; çünkü platform sadece kişisel araç değil, aynı zamanda düzenli buluşma konusu ve ortak öğrenme zemini haline gelir.",
      ],
    },
  ] as const;
}

function getContentCalendar(locale: string) {
  if (locale === "en") {
    return [
      { day: "Monday", body: "Weekly market-literacy article" },
      { day: "Wednesday", body: "Mini education lesson with visual support" },
      { day: "Friday", body: "League and portfolio weekly summary" },
      { day: "Sunday", body: "Leaders of the week and badge winners" },
    ] as const;
  }

  return [
    { day: "Pazartesi", body: "Haftalık piyasa okuryazarlığı yazısı" },
    { day: "Çarşamba", body: "Görsel destekli mini eğitim dersi" },
    { day: "Cuma", body: "Haftanın lig ve portföy özeti" },
    { day: "Pazar", body: "Haftanın liderleri ve rozet kazananlar" },
  ] as const;
}

function getStarterPosts(locale: string) {
  if (locale === "en") {
    return [
      {
        tag: "Weekly literacy",
        title: "What is a virtual portfolio?",
        excerpt: "Explain why simulation-based investing helps people build language and confidence before facing real-money decisions.",
        keywords: ["virtual portfolio", "financial literacy", "market learning"],
      },
      {
        tag: "Risk management",
        title: "How is risk management learned?",
        excerpt: "Show that risk is not fear; it is the discipline of position size, patience, and scenario thinking.",
        keywords: ["risk management", "portfolio discipline", "beginner investing"],
      },
      {
        tag: "Indicators",
        title: "RSI, MACD, and trend for beginners",
        excerpt: "Turn technical indicators into simple language so new users can compare momentum, direction, and caution.",
        keywords: ["RSI", "MACD", "trend analysis"],
      },
      {
        tag: "Community",
        title: "How do Rotary leagues work?",
        excerpt: "Describe how communities can create their own invite-based competition rhythm around education and shared review.",
        keywords: ["Rotary league", "community competition", "virtual trading"],
      },
    ] as const;
  }

  return [
    {
      tag: "Haftalık okuryazarlık",
      title: "Sanal portföy nedir?",
      excerpt: "Simülasyon temelli yatırım deneyiminin, kullanıcıya gerçek para baskısı olmadan dil ve güven kazandırdığını anlatır.",
      keywords: ["sanal portföy", "finansal okuryazarlık", "piyasa eğitimi"],
    },
    {
      tag: "Risk yönetimi",
      title: "Risk yönetimi nasıl öğrenilir?",
      excerpt: "Riski korku değil; pozisyon boyutu, sabır ve senaryo düşüncesi disiplini olarak açıklar.",
      keywords: ["risk yönetimi", "portföy disiplini", "yeni başlayan yatırım"],
    },
    {
      tag: "Göstergeler",
      title: "Yeni başlayanlar için RSI, MACD ve trend",
      excerpt: "Teknik göstergeleri sade bir dille anlatarak momentum, yön ve temkin ihtiyacını ayırt etmeyi kolaylaştırır.",
      keywords: ["RSI", "MACD", "trend analizi"],
    },
    {
      tag: "Topluluk",
      title: "Rotary ligleri nasıl çalışır?",
      excerpt: "Toplulukların eğitim ve ortak değerlendirme etrafında kendi davetli yarışma ritmini nasıl kurabileceğini gösterir.",
      keywords: ["Rotary ligi", "topluluk yarışması", "sanal işlem"],
    },
  ] as const;
}

function getEditorialPillars(locale: string) {
  if (locale === "en") {
    return [
      {
        eyebrow: "Editorial 1",
        title: "Market literacy notes",
        body: "Explain concepts, indicators, and decision habits with a practical tone that helps members act, not just read.",
      },
      {
        eyebrow: "Editorial 2",
        title: "Community stories",
        body: "Highlight how Rotary leagues use the platform, what they learn, and how engagement grows over time.",
      },
      {
        eyebrow: "Editorial 3",
        title: "Platform updates",
        body: "Use the blog to announce new features, training series, and upcoming competition cycles with a clear CTA.",
      },
    ] as const;
  }

  return [
    {
      eyebrow: "Editoryal 1",
      title: "Piyasa okuryazarlığı notları",
      body: "Kavramları, göstergeleri ve karar alışkanlıklarını yalnızca anlatan değil kullandıran bir dille sunar.",
    },
    {
      eyebrow: "Editoryal 2",
      title: "Topluluk hikayeleri",
      body: "Rotary liglerinin platformu nasıl kullandığını, neler öğrendiğini ve katılımın nasıl büyüdüğünü görünür kılar.",
    },
    {
      eyebrow: "Editoryal 3",
      title: "Platform güncellemeleri",
      body: "Yeni özellikleri, eğitim serilerini ve yarışma dönemlerini net bir çağrıyla blog üzerinden duyurur.",
    },
  ] as const;
}
