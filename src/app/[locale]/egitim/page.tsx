import Link from "next/link";
import type { Metadata } from "next";
import { EducationProgressTracker } from "@/components/education/EducationProgressTracker";
import { ManagedContentList } from "@/components/ManagedContentList";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getManagedContentItems } from "@/lib/managed-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/egitim", page: "education" });
}

type ContentBlock = {
  title: string;
  paragraphs: string[];
};

type LearningTrack = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
};

type LearningLevel = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  lesson: ContentBlock;
  quiz: ContentBlock;
  module: ContentBlock;
};

type GlossaryItem = {
  term: string;
  paragraphs: string[];
};

type EducationContent = {
  learningDesignEyebrow: string;
  learningDesignTitle: string;
  learningDesignParagraphs: string[];
  communityTitle: string;
  communityParagraphs: string[];
  tracks: LearningTrack[];
  outcomesTitle: string;
  outcomesParagraphs: string[];
  outcomeItems: ContentBlock[];
  learningLevels: LearningLevel[];
  glossaryTitle: string;
  glossaryParagraphs: string[];
  glossaryItems: GlossaryItem[];
};

export default async function EducationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const pageCopy = getUiCopy(locale).simplePages.education;
  const educationItems = await getManagedContentItems({ type: "EDUCATION", locale });
  const content = getEducationContent(locale);

  return (
    <div className="grid gap-6">
      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{locale === "en" ? "Enbilir learning library" : "Enbilir eğitim kütüphanesi"}</p>
        <h1 className="mt-2 text-3xl font-black text-[#152033]">{pageCopy.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{pageCopy.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {pageCopy.modules.map((module) => (
            <span key={module} className="rounded-full border border-[#d1bfa7] bg-[#fffaf6] px-3 py-1 text-xs font-black text-[#49494b]">
              {module}
            </span>
          ))}
        </div>
      </section>
      <section className="education-growth-path rounded-[1.5rem] border border-white/10 p-5 text-white shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">
              {locale === "tr" ? "Ürün içi öğrenme yolu" : "In-product learning path"}
            </p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">
              {locale === "tr" ? "Oku, sanal portföyde dene, ligde tartış, AI raporla gözden geçir." : "Read, test in a virtual portfolio, discuss in a league, and review with AI reports."}
            </h2>
          </div>
          <Link href={`/${locale}/kayit`} className="premium-cta px-5 py-3 text-sm font-black">
            {locale === "tr" ? "Öğrenmeye başla" : "Start learning"}
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {getEducationGrowthSteps(locale).map((item) => (
            <Link key={item.href} href={item.href} className="education-growth-step rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d1bfa7]">{item.step}</p>
              <h3 className="mt-2 text-base font-black text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>
      <EducationProgressTracker locale={locale} />
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="premium-card premium-card--interactive p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{content.learningDesignEyebrow}</p>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">{content.learningDesignTitle}</h2>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600">
            {content.learningDesignParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <h3 className="mt-6 text-xl font-black text-[#152033]">{content.communityTitle}</h3>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600">
            {content.communityParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {content.tracks.map((track) => (
              <div key={track.title} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#0f766e]">{track.eyebrow}</p>
                <h3 className="mt-2 text-lg font-black text-[#152033]">{track.title}</h3>
                <div className="mt-2 grid gap-3 text-sm leading-6 text-slate-600">
                  {track.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="premium-card premium-card--dark p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5a623]">{content.outcomesTitle}</p>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-200">
            {content.outcomesParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {content.outcomeItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-black text-white">{item.title}</p>
                <div className="mt-2 grid gap-3 text-sm leading-6 text-slate-300">
                  {item.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        {content.learningLevels.map((level) => (
          <article key={level.title} className="premium-card premium-card--interactive p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{level.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">{level.title}</h2>
            <div className="mt-2 grid gap-4 text-sm leading-7 text-slate-600">
              {level.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
                <p className="text-sm font-black text-[#152033]">{level.lesson.title}</p>
                <div className="mt-2 grid gap-3 text-sm leading-6 text-slate-600">
                  {level.lesson.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{locale === "tr" ? "Mini quiz" : "Mini quiz"}</p>
                <p className="mt-2 text-sm font-black text-[#152033]">{level.quiz.title}</p>
                <div className="mt-2 grid gap-3 text-sm leading-6 text-slate-600">
                  {level.quiz.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
                <p className="text-sm font-black text-[#152033]">{level.module.title}</p>
                <div className="mt-2 grid gap-3 text-sm leading-6 text-slate-600">
                  {level.module.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{locale === "tr" ? "Temel Terimler" : "Core Terms"}</p>
        <h2 className="mt-2 text-2xl font-black text-[#152033]">{content.glossaryTitle}</h2>
        <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600">
          {content.glossaryParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {content.glossaryItems.map((item) => (
            <article key={item.term} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
              <h3 className="text-sm font-black text-[#152033]">{item.term}</h3>
              <div className="mt-2 grid gap-3 text-sm leading-6 text-slate-600">
                {item.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      {educationItems.length > 0 ? (
        <ManagedContentList
          items={educationItems}
          featuredLabel={locale === "en" ? "Featured" : "Öne çıkan"}
          showBody={false}
          linkBasePath={`/${locale}/egitim`}
          linkLabel={locale === "en" ? "Read lesson" : "Dersi oku"}
        />
      ) : null}
    </div>
  );
}

function getEducationContent(locale: string): EducationContent {
  if (locale === "en") {
    return {
      learningDesignEyebrow: "Learning design",
      learningDesignTitle: "Short, practical, and repeatable learning flows for market literacy.",
      learningDesignParagraphs: [
        "The education page is designed to turn financial literacy into a calm, structured, and repeatable learning experience. Enbilir does not approach education as a long theoretical lecture. It tries to build a practical language that users can immediately connect to charts, virtual portfolio decisions, community conversations, and AI-supported summaries.",
        "Many people can reach financial information today, but reaching information is not the same as knowing how to use it. The harder part is separating meaningful signals from noise, slowing down before a decision, and asking the right questions about risk, time frame, and uncertainty.",
        "That is why this learning flow begins with simple concepts such as price, trend, volatility, allocation, and drawdown. It then connects those concepts to simulated portfolio practice, so the user can see how a decision behaves without putting real money at risk.",
        "The structure is especially suitable for Rotarians, Rotaractors, and curious learners who want a common language. The purpose is not to tell users what to buy or sell. The purpose is to help them understand what they are looking at and why a decision should be reviewed from more than one angle.",
      ],
      communityTitle: "Learning with a shared rhythm",
      communityParagraphs: [
        "The overall structure is built for communities that want a common language, visible progress, and repeatable reflection. A user may learn alone, but learning becomes stronger when questions, comparisons, and review habits are shared inside a trusted group.",
        "In a Rotary or Rotaract environment, market literacy can become a recurring conversation rather than a one-time presentation. A league, a weekly note, a virtual portfolio review, or an AI summary can all become simple anchors for regular learning.",
        "This does not turn the community into an advisory environment. The boundary is clear: Enbilir is education-first, simulation-based, and not investment advice. The value of the community is to improve thinking, not to give instructions.",
      ],
      tracks: [
        {
          eyebrow: "Track 1",
          title: "Market literacy foundations",
          paragraphs: [
            "Build a common language around price, trend, volatility, liquidity, and risk so community members start from the same ground.",
            "This track helps users understand that price is not only a number on a screen. It reflects expectations, news flow, liquidity, emotion, and timing. Once this is understood, charts become easier to discuss and less intimidating.",
          ],
        },
        {
          eyebrow: "Track 2",
          title: "Virtual portfolio discipline",
          paragraphs: [
            "Teach allocation logic, cash management, and scenario comparison through action instead of theory alone.",
            "A virtual portfolio gives users a safe rehearsal space. They can observe what happens when they concentrate too much in one asset, ignore cash, chase a fast mover, or diversify more carefully.",
          ],
        },
        {
          eyebrow: "Track 3",
          title: "AI-assisted interpretation",
          paragraphs: [
            "Use the assistant to understand why signals appear, when to stay cautious, and how to read indicators together.",
            "The AI assistant should not be treated as a shortcut for decisions. It is a thinking partner that explains context, surfaces risk notes, and helps the user compare technical signals with broader market behavior.",
          ],
        },
      ],
      outcomesTitle: "Expected outcomes",
      outcomesParagraphs: [
        "The goal is not only to teach a few concepts, but to help users think in a calmer, more structured, and more responsible way.",
        "A successful education flow should make the platform easier to enter, the language of the community more consistent, and the learning rhythm more sustainable over time.",
      ],
      outcomeItems: [
        {
          title: "Faster onboarding",
          paragraphs: [
            "New members can understand the product logic quickly without waiting for one-to-one explanation. They see the main path: learn the terms, test decisions virtually, compare results, and review signals with context.",
          ],
        },
        {
          title: "More consistent language",
          paragraphs: [
            "The whole community starts speaking about markets with clearer, less intimidating concepts. Risk, trend, allocation, drawdown, and signal confidence become practical words rather than technical barriers.",
          ],
        },
        {
          title: "Stronger continuity",
          paragraphs: [
            "Education no longer feels separate from the rest of the platform; it supports virtual trading, rankings, league discussions, and AI insights. This continuity is what turns reading into habit.",
          ],
        },
      ],
      learningLevels: [
        {
          eyebrow: "Beginner",
          title: "Core concepts",
          paragraphs: [
            "Start with the language of price, trend, volatility, allocation, and time frame so new users do not feel lost. This level gives users the basic vocabulary they need before they compare assets or read AI summaries.",
            "The goal is to make the first contact with markets less intimidating. Users should be able to explain what they are looking at before they try to interpret whether a movement is positive or negative.",
          ],
          lesson: {
            title: "What is a virtual portfolio?",
            paragraphs: [
              "A virtual portfolio mirrors real market movement without placing real orders. It lets users test decision quality safely and observe the consequences of their choices without financial pressure.",
              "Used correctly, it is not a game balance to be spent carelessly. It is a rehearsal space where users can learn how allocation, timing, patience, and diversification change portfolio behavior.",
            ],
          },
          quiz: {
            title: "Why is a virtual portfolio useful for beginners?",
            paragraphs: [
              "Because it creates a safe environment to practice decision-making before any real financial risk exists.",
              "A beginner can make mistakes, review those mistakes, and understand their own habits without turning the learning process into a financial loss.",
            ],
          },
          module: {
            title: "Core concepts module detail",
            paragraphs: [
              "The module introduces price, trend, allocation, and basic simulation logic with a simple applied flow.",
              "The user first learns the language, then sees how that language appears inside the virtual portfolio and the AI assistant. This makes the concept visible instead of leaving it as theory.",
            ],
          },
        },
        {
          eyebrow: "Intermediate",
          title: "Risk and return",
          paragraphs: [
            "Teach users how upside and downside travel together and why discipline matters more than guessing. The question is not only what can be gained, but also what can go wrong if the idea fails.",
            "This level introduces position sizing, cash protection, diversification, drawdown, patience, and scenario thinking in plain language.",
          ],
          lesson: {
            title: "How is risk managed?",
            paragraphs: [
              "Risk management starts before a trade or allocation decision is made. The user should ask how much of the portfolio is affected, what happens if the expectation fails, and whether the decision fits the overall learning plan.",
              "Good risk management does not guarantee correct predictions. It helps prevent wrong predictions from damaging the entire portfolio behavior.",
            ],
          },
          quiz: {
            title: "What is the first sign of poor risk management?",
            paragraphs: [
              "Putting too much capital into a single idea without leaving room for uncertainty.",
              "When one asset or one opinion becomes too dominant, the portfolio becomes fragile. A disciplined user leaves room for being wrong.",
            ],
          },
          module: {
            title: "Risk and return module detail",
            paragraphs: [
              "The module turns risk and return from abstract theory into visible portfolio behavior.",
              "Users can compare concentrated and balanced allocations, observe how drawdowns feel, and learn why waiting is sometimes an active decision rather than passivity.",
            ],
          },
        },
        {
          eyebrow: "Advanced",
          title: "Portfolio discipline",
          paragraphs: [
            "Move from isolated trades to repeatable behavior patterns supported by data and reflection. Portfolio discipline asks better questions than 'which asset will rise?'",
            "Is the portfolio balanced? Is the risk understandable? Are past decisions reviewed? Are AI insights being used as context rather than instruction? These questions create long-term learning quality.",
          ],
          lesson: {
            title: "Why does a disciplined portfolio win over time?",
            paragraphs: [
              "Because repeatable process beats emotional reaction. Good portfolios are not built from one great trade but from a consistent framework.",
              "A user may be lucky once, but long-term consistency depends on allocation, review, patience, and risk control. Discipline reduces the tendency to become too optimistic after gains or too fearful after losses.",
            ],
          },
          quiz: {
            title: "What creates long-term consistency?",
            paragraphs: [
              "A repeatable framework for allocation, review, and risk control instead of emotional reaction to every move.",
              "Consistency is more about behavior than prediction. The user learns to evaluate both winning and losing decisions by process, not only by outcome.",
            ],
          },
          module: {
            title: "Portfolio discipline module detail",
            paragraphs: [
              "The module encourages calmer, more consistent, and more measured portfolio decisions over time.",
              "It also shows how AI insights, league discussions, and performance history can be used together without replacing personal responsibility.",
            ],
          },
        },
      ],
      glossaryTitle: "The concepts users will see often across the platform",
      glossaryParagraphs: [
        "These terms create a practical language for interpreting portfolio behavior, AI signals, and learning flow across the product.",
        "They are not meant to be memorized as a dry glossary. Each term should help the user ask a better question inside the platform.",
      ],
      glossaryItems: [
        {
          term: "Virtual balance",
          paragraphs: [
            "The starting simulated capital given to the user so they can learn without exposing real savings.",
            "It is used for practice, ranking, portfolio review, and decision awareness. It should be treated as a serious rehearsal tool, not as meaningless play money.",
          ],
        },
        {
          term: "Diversification",
          paragraphs: [
            "Spreading capital across multiple assets instead of relying on one idea alone.",
            "Diversification does not remove all risk, but it can reduce dependence on a single event, asset, or expectation.",
          ],
        },
        {
          term: "Drawdown",
          paragraphs: [
            "The decline from a portfolio peak to a lower point; it helps users understand downside pressure.",
            "Drawdown reminds users to look not only at return, but also at the path taken to reach that return.",
          ],
        },
        {
          term: "Signal confidence",
          paragraphs: [
            "A measure of how strongly the current technical inputs align with the AI signal being shown.",
            "High confidence does not mean certainty. It is a support metric that should be read together with time frame, market conditions, volatility, and the user's own risk structure.",
          ],
        },
      ],
    };
  }

  return {
    learningDesignEyebrow: "Öğrenme Tasarımı",
    learningDesignTitle: "Rotary Topluluğu İçin Kısa, Uygulanabilir ve Tekrar Edilebilir Eğitim Akışları",
    learningDesignParagraphs: [
      "Enbilir’in eğitim yaklaşımı, klasik anlamda bir “finans dersi” vermekten çok daha fazlasını hedefler. Burada amaç, piyasayı karmaşık grafiklerden, anlaşılması zor terimlerden ve rastgele tahminlerden ibaret görmek yerine; herkesin anlayabileceği, tekrar edebileceği ve kendi kararlarını daha bilinçli şekilde değerlendirebileceği bir öğrenme düzeni kurmaktır.",
      "Bugün finansal piyasalara ilgi duyan çok sayıda kişi, bilgiye ulaşmakta zorlanmıyor; asıl zorluk, ulaşılan bilginin içinden neyin gerçekten anlamlı olduğunu ayırt edebilmekte başlıyor. Sosyal medya yorumları, hızlı yükselen varlık hikâyeleri, kulaktan dolma beklentiler ve anlık heyecanlar çoğu zaman öğrenmenin önüne geçiyor. Enbilir Eğitim bölümü tam bu noktada devreye giriyor. Kullanıcının piyasaya daha sakin, daha sistemli ve daha sorumlu yaklaşmasını sağlayacak kısa ama etkili öğrenme akışları sunuyor.",
      "Bu eğitim tasarımı özellikle Rotary, Rotaract ve araştırmayı seven geniş toplulukların yapısına uygun olarak kurgulanmıştır. Çünkü bu topluluklarda öğrenme sadece bireysel fayda için değil, ortak dil kurmak, bilgiyi paylaşmak ve birbirinden gelişerek ilerlemek için değerlidir. Enbilir’de amaç, kullanıcıya yalnızca “ne almalı, ne satmalı” gibi dar bir bakış açısı vermek değildir. Tam tersine; fiyat nedir, trend nasıl okunur, risk neden göz ardı edilmemelidir, sanal portföy neden öğretici bir deney alanıdır ve yapay zekâ içgörüleri insan muhakemesiyle nasıl birlikte değerlendirilmelidir sorularına daha geniş bir çerçevede cevap vermektir.",
      "Bu sayfadaki eğitim akışı üç temel ilkeye dayanır: sade anlatım, uygulanabilir bilgi ve tekrar edilebilir disiplin. Sade anlatım, yeni başlayan bir kullanıcının ürkmemesini sağlar. Uygulanabilir bilgi, öğrenilen şeyin platform içinde hemen denenebilmesine imkân verir. Tekrar edilebilir disiplin ise kullanıcının bir defalık heyecanla değil, zaman içinde gelişen bir alışkanlıkla ilerlemesini hedefler.",
      "Enbilir’in eğitim tasarımında kısa videolar, infografikler, senaryo kartları, kontrol listeleri ve mini quizler birlikte kullanılır. Bunun nedeni, herkesin aynı yöntemle öğrenmemesidir. Bazı kullanıcı görsel anlatımla daha hızlı kavrar; bazıları kısa soru-cevaplarla konuyu pekiştirir; bazıları ise sanal portföy üzerinde deneyerek öğrenir. Bu nedenle eğitim bölümü, yalnızca okunacak bir metin alanı değil, platformun geri kalanıyla bağlantılı canlı bir öğrenme haritası olarak düşünülmelidir.",
    ],
    communityTitle: "Rotary Topluluğu İçin Kısa, Uygulanabilir ve Tekrar Edilebilir Eğitim Akışları",
    communityParagraphs: [
      "Rotary geleneğinde öğrenme, sadece kişinin kendisini geliştirmesi için değil, topluma daha bilinçli katkı sunabilmesi için de önemlidir. Enbilir’in eğitim akışları da bu anlayıştan beslenir. Finansal okuryazarlık, yalnızca yatırım yapan kişileri ilgilendiren dar bir alan değildir. Aile bütçesinden emeklilik planlamasına, gençlerin para yönetimi alışkanlıklarından kurumların risk algısına kadar çok geniş bir yaşam alanını etkiler.",
      "Bu nedenle Enbilir Eğitim bölümü, kısa ve uygulanabilir içeriklerle başlar. Kullanıcıyı uzun, yorucu ve teknik metinlerin içine bırakmaz. Önce ortak kavramları açıklar. Sonra bu kavramları sanal portföy pratiğiyle ilişkilendirir. Ardından yapay zekâ destekli yorumlama alanına geçerek veriye daha analitik bakmayı teşvik eder.",
      "Buradaki eğitim anlayışı, “bir defa oku ve unut” şeklinde değil, “öğren, uygula, gözden geçir ve tekrar dene” şeklinde ilerler. Çünkü piyasa okuryazarlığı, tek bir dersle oluşmaz. İnsan karar verirken heyecanlanır, yanılır, acele eder, bazen de gereğinden fazla bekler. Enbilir, bu doğal insan davranışlarını yok saymaz. Tam tersine, güvenli bir simülasyon ortamı içinde bu davranışların fark edilmesini sağlar.",
      "Rotary ve Rotaract gibi topluluklarda bu yaklaşımın ayrıca güçlü bir tarafı vardır: Aynı platform üzerinde öğrenen kişiler, zamanla ortak bir dil geliştirmeye başlar. “Risk”, “trend”, “geri çekilme”, “dağılım”, “sinyal güveni” gibi kavramlar, soyut teknik ifadeler olmaktan çıkar; topluluk içinde konuşulabilir, tartışılabilir ve geliştirilebilir başlıklara dönüşür.",
    ],
    tracks: [
      {
        eyebrow: "Rota 1",
        title: "Piyasa Okuryazarlığı Temeli",
        paragraphs: [
          "Piyasa okuryazarlığı, bir kişinin her finansal ürünü bilmesi anlamına gelmez. Asıl mesele, piyasada olup bitenleri anlamlandırabilecek temel bir düşünme çerçevesine sahip olmaktır. Fiyat neden hareket eder, trend neyi gösterir, volatilite neden önemlidir, risk hangi noktada görünür hale gelir ve haber akışı kararlarımızı nasıl etkiler? Bu sorulara verilen cevaplar, kullanıcının piyasaya daha sağlıklı bakmasını sağlar.",
          "Enbilir’de piyasa okuryazarlığı temeli, en sade yerden başlar: Fiyatın yalnızca bir rakam olmadığı anlatılır. Fiyat; beklentilerin, haberlerin, arz-talep dengesinin, korkunun, iyimserliğin ve bazen de aşırı heyecanın birleştiği noktadır. Bu nedenle fiyatı tek başına okumak çoğu zaman yeterli değildir. Fiyatın geçmiş hareketi, işlem hacmi, genel piyasa koşulları ve kullanıcı psikolojisi birlikte değerlendirilmelidir.",
          "Bu rota, yeni başlayan kullanıcıların piyasaya daha kontrollü bir zihinsel hazırlıkla girmesini sağlar. Çünkü en büyük hatalardan biri, daha temel kavramlar oturmadan işlem pratiğine başlamaktır. Kullanıcı fiyat hareketini sadece “çıktı” veya “düştü” diye yorumladığında, kararları da genellikle yüzeysel kalır. Oysa piyasa okuryazarlığı geliştiğinde kullanıcı şunu sormaya başlar: Bu hareket neden olmuş olabilir? Bu yükseliş sürdürülebilir mi? Bu düşüş bir fırsat mı, yoksa daha büyük bir riskin işareti mi? Ben bu kararı hangi varsayıma dayanarak alıyorum?",
          "Rota 1’in amacı, kullanıcıya kesin cevaplar vermek değildir. Amaç, doğru soruları sordurmaktır. Çünkü finansal okuryazarlığın ilk adımı, acele karar vermeden önce meseleyi anlamaya çalışmaktır.",
        ],
      },
      {
        eyebrow: "Rota 2",
        title: "Sanal Portföy Disiplini",
        paragraphs: [
          "Sanal portföy, Enbilir’in en önemli öğrenme alanlarından biridir. Çünkü insan, yalnızca okuyarak değil, karar vererek ve verdiği kararın sonucunu görerek öğrenir. Ancak gerçek para ile yapılan denemeler, özellikle yeni başlayanlar için gereksiz kaygı ve risk yaratabilir. Sanal portföy bu noktada güvenli bir deneme alanı sağlar.",
          "Bu rotada kullanıcı, portföy kurmanın yalnızca birkaç varlık seçmekten ibaret olmadığını görür. Bir portföyde dağılım vardır, nakit yönetimi vardır, risk sınırı vardır, bekleme disiplini vardır ve en önemlisi, kararların sonradan gözden geçirilmesi vardır. Kullanıcı sanal ortamda işlem yaptıkça, hangi kararları heyecanla aldığını, hangi noktalarda gereğinden fazla risk yüklendiğini ve hangi durumlarda daha sabırlı davranması gerektiğini fark etmeye başlar.",
          "Sanal portföy disiplini, kullanıcıya şunu öğretir: Başarı tek bir doğru tahminden doğmaz. Uzun vadede asıl farkı yaratan şey, tekrar edilebilir bir karar çerçevesidir. Bugün iyi bir sonuç almak, yarın da doğru karar verileceği anlamına gelmez. Ama kullanıcı kendi yöntemini kurar, riskini sınırlar, sonuçları düzenli inceler ve hatalarından öğrenirse, zaman içinde daha tutarlı bir bakış kazanır.",
          "Bu rota aynı zamanda topluluk içi öğrenmeyi de güçlendirir. Çünkü sanal portföy yarışmaları ve sıralamalar, kullanıcıları sadece rekabete değil, karşılaştırmalı öğrenmeye de teşvik eder. Bir kullanıcının neden daha iyi performans gösterdiği, hangi varlıklara nasıl dağılım yaptığı, düşüş dönemlerinde nasıl davrandığı gibi sorular eğitim açısından değerlidir.",
        ],
      },
      {
        eyebrow: "Rota 3",
        title: "AI Destekli Yorumlama",
        paragraphs: [
          "Yapay zekâ, finansal okuryazarlıkta güçlü bir yardımcı olabilir; ancak tek başına karar verici olarak görülmemelidir. Enbilir’de AI destekli yorumlama yaklaşımı, kullanıcıya “makine söyledi, o halde doğrudur” anlayışını değil, “veri ne söylüyor, sinyal nasıl oluşmuş, insan muhakemesi burada ne eklemeli” anlayışını kazandırmayı hedefler.",
          "Bu rota, kullanıcının AI sinyallerini daha bilinçli okumasına yardımcı olur. Bir sinyalin güçlü görünmesi, onun risksiz olduğu anlamına gelmez. Bir varlık için olumlu görünüm oluşması, piyasanın her koşulda aynı yönde devam edeceği anlamına gelmez. Bu nedenle kullanıcıya sinyal güveni, teknik göstergeler, zaman aralığı, trend gücü, volatilite ve haber etkisi gibi unsurların birlikte değerlendirilmesi gerektiği anlatılır.",
          "AI destekli yorumlama, özellikle yeni başlayan kullanıcılar için karmaşık piyasa bilgisini daha anlaşılır hale getirebilir. Ancak burada asıl değer, yapay zekânın verdiği cevabı ezberlemek değil, o cevabın arkasındaki mantığı anlamaktır. Enbilir’in eğitim yaklaşımı bu nedenle AI Asistanı’nı bir “kestirme karar makinesi” olarak değil, bir “düşünme ortağı” olarak konumlandırır.",
          "Kullanıcı zamanla şu beceriyi geliştirir: Bir sinyal gördüğünde hemen harekete geçmek yerine, o sinyalin hangi veriye dayandığını, hangi koşullarda geçerliliğini kaybedebileceğini ve kendi sanal portföyündeki risk yapısıyla uyumlu olup olmadığını sorgular. İşte bu sorgulama alışkanlığı, finansal okuryazarlığın en önemli aşamalarından biridir.",
        ],
      },
    ],
    outcomesTitle: "Beklenen Çıktı",
    outcomesParagraphs: [
      "Enbilir Eğitim bölümünün beklenen çıktısı, kullanıcının yalnızca birkaç kavram öğrenmesi değildir. Asıl amaç, kullanıcının piyasaya bakış biçimini daha düzenli, daha dikkatli ve daha sorumlu hale getirmektir.",
      "Bu eğitim akışının sonunda kullanıcıdan beklenen ilk kazanım, temel piyasa kavramlarını daha rahat kullanabilmesidir. Fiyat, trend, volatilite, risk, getiri, dağılım, geri çekilme ve sinyal güveni gibi kavramlar, kullanıcının zihninde birbirinden kopuk ifadeler olmaktan çıkar. Bunlar, karar verme sürecinin parçaları haline gelir.",
      "İkinci kazanım, sanal portföy üzerinden pratik yapma alışkanlığıdır. Kullanıcı artık yalnızca izleyen biri değildir; deneme yapan, sonucunu gören, hatasını anlayan ve kararını geliştiren bir öğrenen haline gelir. Bu yaklaşım, gerçek finansal risk oluşturmadan deneyim kazanılmasını sağlar.",
      "Üçüncü kazanım ise yapay zekâ destekli içgörüleri daha bilinçli yorumlayabilmektir. Kullanıcı, AI Asistanı’nın ürettiği sinyalleri körü körüne takip etmek yerine, bu sinyalleri kendi düşünme sürecine dahil eder. Böylece teknoloji, insan muhakemesinin yerine geçmez; onu destekleyen bir araç haline gelir.",
      "Sonuçta Enbilir Eğitim, kullanıcının piyasaya daha sakin bakmasını, kendi kararlarını daha iyi sorgulamasını ve topluluk içinde daha tutarlı bir finansal dil kullanmasını hedefler.",
    ],
    outcomeItems: [
      {
        title: "Daha Hızlı Onboarding",
        paragraphs: [
          "Yeni bir platforma başlayan kullanıcı için ilk birkaç dakika çok önemlidir. Eğer kullanıcı ne yapacağını anlamazsa, platformun sunduğu değer ne kadar güçlü olursa olsun, deneyim yarım kalabilir. Enbilir’de eğitim akışının ilk amacı, kullanıcının bu başlangıç eşiğini daha kolay geçmesini sağlamaktır.",
          "Daha hızlı onboarding, kullanıcının uzun açıklamalara boğulmadan, adım adım ilerlemesi demektir. Önce platformun ne olduğu anlaşılır: Enbilir gerçek para ile işlem yaptıran bir yatırım platformu değildir; sanal portföy, eğitim, piyasa okuryazarlığı ve AI destekli analiz deneyimi sunan bir öğrenme ortamıdır. Bu ayrım baştan netleştiğinde kullanıcı daha rahat hareket eder.",
          "Ardından kullanıcı sanal bakiye, portföy, işlem, sıralama ve AI Asistanı gibi ana bölümleri tanır. Bu bölümlerin her biri, öğrenmenin farklı bir tarafını destekler. Sanal bakiye güvenli deneme alanı sunar. Portföy kullanıcının kararlarını takip etmesini sağlar. Sıralama topluluk içinde karşılaştırmalı öğrenme imkânı verir. AI Asistanı ise veriyi yorumlamaya yardımcı olur.",
          "Hızlı onboarding’in amacı kullanıcıyı yüzeysel geçirmek değildir. Amaç, kullanıcının ilk adımı korkmadan atmasını sağlamaktır. İlk adımı atan kullanıcı, zamanla daha derin içeriklere, senaryo analizlerine ve portföy disiplinine geçebilir.",
        ],
      },
      {
        title: "Daha Tutarlı Bir Dil",
        paragraphs: [
          "Finansal piyasalarda en büyük sorunlardan biri, herkesin aynı kelimeleri kullanıp farklı şeyler anlamasıdır. Bir kişi “risk” dediğinde sadece kaybetme ihtimalini düşünürken, başka biri fırsatın doğal bedelini düşünebilir. Bir kişi “trend” dediğinde kısa vadeli hareketi kastederken, başka biri daha uzun vadeli yönü ifade ediyor olabilir.",
          "Enbilir Eğitim bölümü, kullanıcıların ortak bir kavram zemini oluşturmasına yardımcı olur. Bu özellikle topluluk içinde çok değerlidir. Çünkü aynı dili konuşan bir topluluk, daha sağlıklı tartışır, daha iyi öğrenir ve kararlarını daha bilinçli değerlendirir.",
          "Daha tutarlı bir dil, yalnızca teknik doğruluk için değil, psikolojik denge için de önemlidir. Piyasayı sadece “uçtu”, “çöktü”, “kaçtı”, “fırsat bitti” gibi duygusal ifadelerle konuşmak, kullanıcının karar kalitesini düşürür. Bunun yerine “trend güçleniyor mu?”, “geri çekilme hangi seviyede?”, “risk-getiri dengesi makul mü?”, “bu sinyal hangi veriye dayanıyor?” gibi sorular daha öğretici bir zemin kurar.",
          "Enbilir’in eğitim dili, kullanıcıyı korkutmaz ama rehavete de sürüklemez. Piyasayı basitleştirir, fakat hafife almaz. Bu denge, platformun karakteri açısından önemlidir.",
        ],
      },
      {
        title: "Daha Güçlü Devamlılık",
        paragraphs: [
          "Öğrenmenin gerçek değeri, süreklilik kazandığında ortaya çıkar. Bir kullanıcı bir kez eğitim içeriği okuyup sonra platformun geri kalanından koparsa, öğrenme davranışa dönüşmez. Enbilir’de eğitim bölümü bu nedenle işlem alanı, sanal portföy, liderlik tablosu, ligler, topluluk ve AI Asistanı ile bağlantılı düşünülmelidir.",
          "Daha güçlü devamlılık, kullanıcının öğrendiği kavramları hemen platform içinde deneyebilmesiyle sağlanır. Risk yönetimini öğrenen kullanıcı, sanal portföyünde tüm bakiyesini tek bir varlığa bağlamamayı dener. Çeşitlendirmeyi öğrenen kullanıcı, portföy dağılımını gözden geçirir. AI sinyal güvenini öğrenen kullanıcı, Asistan’ın yorumlarını daha dikkatli okumaya başlar.",
          "Bu döngü, öğrenmeyi canlı tutar. Kullanıcı sadece bilgi tüketmez; bilgiyle davranış geliştirir. Bu da Enbilir’i basit bir içerik sayfası olmaktan çıkarıp, uygulamalı bir finansal okuryazarlık ortamına dönüştürür.",
        ],
      },
    ],
    learningLevels: [
      {
        eyebrow: "Başlangıç",
        title: "Temel Kavramlar",
        paragraphs: [
          "Temel kavramlar bölümü, Enbilir’e yeni başlayan kullanıcıların kendilerini kaybolmuş hissetmemesi için hazırlanmıştır. Finansal piyasalar ilk bakışta karmaşık görünebilir. Çok sayıda varlık, grafik, oran, haber ve yorum aynı anda kullanıcının karşısına çıkar. Bu yoğunluk içinde sağlam bir başlangıç noktası yoksa, kullanıcı ya acele karar verir ya da tamamen uzaklaşır.",
          "Bu bölümün amacı, piyasayı anlaşılır parçalara ayırmaktır. Fiyatın ne olduğu, trendin nasıl yorumlanacağı, portföyün neden tek bir işlemden ibaret olmadığı, riskin neden kararın ayrılmaz bir parçası olduğu ve sanal ortamda deneme yapmanın neden değerli olduğu sade bir dille anlatılır.",
          "Temel kavramlar, yalnızca yeni başlayanlar için değil, deneyimli kullanıcılar için de önemlidir. Çünkü zaman zaman en deneyimli kişiler bile basit ilkeleri ihmal ettikleri için hata yapar. Her şeyi tek fikre bağlamak, kısa vadeli hareketleri uzun vadeli gerçek sanmak, düşüşü hesaba katmadan karar almak veya AI sinyalini tek başına yeterli görmek bu hatalardan bazılarıdır.",
          "Enbilir’in başlangıç modülü, kullanıcıya şu mesajı verir: Piyasayı öğrenmek mümkündür, ama bunun yolu acele etmekten değil, sağlam kavramlarla ilerlemekten geçer.",
        ],
        lesson: {
          title: "Sanal Portföy Nedir?",
          paragraphs: [
            "Sanal portföy, gerçek para kullanmadan piyasa hareketlerini takip etmeyi ve karar pratiği yapmayı sağlayan eğitim amaçlı bir portföydür. Kullanıcıya güvenli bir deneme alanı sunar. Bu alanın en önemli tarafı, hataların mali kayıp yaratmadan öğrenme fırsatına dönüşmesidir.",
            "Gerçek piyasalarda karar verirken insanın üzerinde baskı vardır. Kaybetme korkusu, fırsatı kaçırma endişesi, başkalarının yorumlarından etkilenme ve hızlı sonuç alma isteği karar kalitesini bozabilir. Sanal portföy, bu baskıyı azaltır. Kullanıcı yine karar verir, yine sonuç görür, yine performansını takip eder; fakat bunu gerçek birikimini riske atmadan yapar.",
            "Sanal portföyün öğretici tarafı, sadece kazanç veya kayıp göstermesinde değildir. Asıl değer, kullanıcının kendi davranışını görmesini sağlamasındadır. Hangi varlıklara fazla ağırlık verdi? Düşüş döneminde panikledi mi? Yükseliş gördüğünde geç mi kaldı? Nakit tutmayı ihmal etti mi? Tek bir fikre fazla mı bağlandı? Bu sorular, kullanıcının finansal farkındalığını artırır.",
            "Enbilir’de sanal portföy, yarışma ve sıralama unsurlarıyla da desteklenir. Ancak burada amaç yalnızca birinci olmak değildir. Asıl amaç, kullanıcının kendi karar sürecini daha iyi tanıması ve zamanla daha disiplinli bir portföy yaklaşımı geliştirmesidir.",
          ],
        },
        quiz: {
          title: "Mini Quiz: Sanal Portföy Yeni Başlayanlar İçin Neden Faydalıdır?",
          paragraphs: [
            "Sanal portföy yeni başlayanlar için faydalıdır; çünkü kullanıcıya gerçek finansal risk oluşturmadan karar pratiği yapma imkânı verir. İnsan piyasayı yalnızca okuyarak öğrenemez. Bir noktada seçim yapması, beklemesi, sonucunu görmesi ve kararını değerlendirmesi gerekir. Sanal portföy bu süreci güvenli hale getirir.",
            "Bu alanda yapılan hata, gerçek para kaybına yol açmaz; fakat değerli bir öğrenme deneyimi oluşturur. Kullanıcı acele karar verdiğinde ne olduğunu, tek bir varlığa fazla ağırlık verdiğinde portföyün nasıl etkilendiğini ve düşüş dönemlerinde nasıl davrandığını gözlemleyebilir.",
            "Bu nedenle sanal portföy, yalnızca bir oyun alanı değildir. Doğru kullanıldığında, finansal okuryazarlığın en pratik eğitim araçlarından biridir.",
          ],
        },
        module: {
          title: "Temel Kavramlar Modül Detayı",
          paragraphs: [
            "Temel kavramlar modülü, Enbilir eğitim yapısının giriş kapısıdır. Bu modülde kullanıcı, platformun ana mantığını ve piyasaya bakarken ihtiyaç duyacağı temel dili öğrenir.",
            "Modülün ilk bölümünde fiyat ve piyasa hareketi ele alınır. Kullanıcıya fiyatın yalnızca ekranda görünen bir rakam olmadığı, arkasında beklenti, haber, likidite, duygu ve zamanlama gibi pek çok unsur bulunduğu anlatılır. Ardından trend kavramına geçilir. Trendin her zaman düz bir çizgi halinde ilerlemediği, yükseliş içinde düşüşler, düşüş içinde tepki yükselişleri olabileceği açıklanır.",
            "İkinci bölümde sanal portföy mantığı anlatılır. Kullanıcı, gerçek para kullanmadan karar pratiği yapmanın neden değerli olduğunu öğrenir. Sanal bakiye, pozisyon, dağılım ve sıralama gibi kavramlar sade örneklerle açıklanır.",
            "Üçüncü bölümde kullanıcıya kısa bir uygulama önerilir. Kendi sanal portföyünde küçük bir dağılım yapması, daha sonra bu dağılımın nasıl davrandığını izlemesi istenir. Böylece öğrenme yalnızca metin okumakla sınırlı kalmaz; deneyime dönüşür.",
          ],
        },
      },
      {
        eyebrow: "Orta Seviye",
        title: "Risk ve Getiri",
        paragraphs: [
          "Risk ve getiri, finansal piyasaların ayrılmaz iki unsurudur. Bir yatırım fikrinin yalnızca kazanç ihtimaline bakmak eksik bir yaklaşımdır. Her potansiyel getirinin yanında bir belirsizlik, bir dalgalanma ve bir olası kayıp ihtimali vardır. Enbilir’in risk ve getiri modülü, kullanıcıya bu dengeyi öğretmeyi amaçlar.",
          "Yeni başlayan kullanıcılar çoğu zaman yükseliş ihtimaline odaklanır. “Ne kadar kazanırım?” sorusu cazip gelir. Oysa daha sağlıklı soru şudur: “Bu karar beklediğim gibi gitmezse ne olur?” İşte risk yönetimi bu ikinci soruyla başlar. Kullanıcı yalnızca olumlu senaryoyu değil, olumsuz senaryoyu da düşünmeye başladığında daha olgun kararlar verebilir.",
          "Risk, kaçılması gereken bir şey değildir; anlaşılması ve yönetilmesi gereken bir gerçektir. Getiri ise sabırsızlıkla kovalanacak bir ödül değil, doğru risk yönetimiyle birlikte değerlendirilmesi gereken bir sonuçtur. Bu ayrım, kullanıcının piyasaya daha dengeli bakmasını sağlar.",
          "Bu bölümde pozisyon büyüklüğü, nakit koruması, çeşitlendirme, geri çekilme, sabır ve senaryo düşüncesi gibi başlıklar birlikte ele alınır. Amaç, kullanıcıya karmaşık finans teorileri yüklemek değil, günlük kararlarında kullanabileceği sağlam bir risk farkındalığı kazandırmaktır.",
        ],
        lesson: {
          title: "Risk Yönetimi Nasıl Kurulur?",
          paragraphs: [
            "Risk yönetimi, işlem yaptıktan sonra düşünülecek bir konu değildir. Tam tersine, karar verilmeden önce başlamalıdır. Kullanıcı bir varlığa yönelmeden önce şu soruları sormalıdır: Bu karar portföyümün ne kadarını etkiliyor? Beklentim gerçekleşmezse ne kadar geri çekilme yaşayabilirim? Tüm sermayemi tek bir fikre mi bağlıyorum? Nakit payım yeterli mi? Bu işlem genel stratejimle uyumlu mu?",
            "İyi risk yönetimi, kullanıcının her zaman doğru tahmin yapmasını sağlamaz. Zaten piyasada her zaman doğru tahmin yapmak mümkün değildir. İyi risk yönetimi, yanlış tahminlerin portföyü yıkıcı şekilde etkilemesini engeller. Bu nedenle risk yönetimi bir savunma mekanizması değil, sürdürülebilir öğrenmenin temelidir.",
            "Enbilir’de risk yönetimi özellikle sanal portföy üzerinden anlaşılır hale gelir. Kullanıcı farklı dağılımlar deneyebilir, tek varlığa yoğunlaşmanın etkisini görebilir, nakit tutmanın bazı dönemlerde neden önemli olduğunu anlayabilir. Böylece risk soyut bir kavram olmaktan çıkar, portföy davranışı içinde gözlemlenebilir hale gelir.",
            "Risk yönetiminin önemli bir parçası da sabırdır. Piyasada her an işlem yapmak zorunda olmak gibi yanlış bir duygu oluşabilir. Oysa bazen en doğru karar beklemektir. Beklemek, pasif kalmak değil; koşulların olgunlaşmasını izlemek ve gereksiz risk almamaktır.",
          ],
        },
        quiz: {
          title: "Mini Quiz: Zayıf Risk Yönetiminin İlk İşareti Nedir?",
          paragraphs: [
            "Zayıf risk yönetiminin ilk işareti, belirsizlik payı bırakmadan tek bir fikre aşırı büyük sermaye bağlamaktır. Bu davranış, kullanıcının kararını bir stratejiye değil, çoğu zaman güçlü bir beklentiye veya heyecana dayandırdığını gösterir.",
            "Bir portföyde tek bir varlığın veya tek bir düşüncenin aşırı ağırlık kazanması, beklenmeyen bir piyasa hareketinde ciddi geri çekilmelere yol açabilir. Bu durum sadece finansal sonucu değil, kullanıcının psikolojisini de etkiler. Panik, acele satış, fırsatı kaçırma korkusu ve hatalı telafi işlemleri genellikle bu noktadan sonra başlar.",
            "Bu nedenle iyi risk yönetimi, önce tevazu ister. Piyasanın her zaman bizim beklediğimiz gibi davranmayabileceğini kabul etmek, daha sağlam bir portföy yaklaşımının başlangıcıdır.",
          ],
        },
        module: {
          title: "Risk ve Getiri Modül Detayı",
          paragraphs: [
            "Risk ve getiri modülü, kullanıcının piyasa kararlarında daha dengeli düşünmesini sağlamak için hazırlanmıştır. Bu modülün ana mesajı şudur: Kazanç ihtimali tek başına yeterli değildir; her karar olası kayıp, dalgalanma ve belirsizlikle birlikte değerlendirilmelidir.",
            "Modülün ilk aşamasında risk kavramı sade örneklerle açıklanır. Kullanıcıya, riskin sadece zarar etmek anlamına gelmediği; belirsizlik, fiyat dalgalanması, yanlış zamanlama ve aşırı yoğunlaşma gibi farklı biçimlerde ortaya çıkabileceği anlatılır.",
            "İkinci aşamada getiri beklentisi ele alınır. Kullanıcıya yüksek getiri beklentisinin çoğu zaman daha yüksek belirsizlikle birlikte geldiği hatırlatılır. Bu noktada amaç kullanıcıyı korkutmak değil, daha gerçekçi düşünmesini sağlamaktır.",
            "Üçüncü aşamada risk yönetimi pratiğine geçilir. Kullanıcı kendi sanal portföyünde tüm bakiyeyi tek bir varlığa bağladığında ne olduğunu, daha dengeli dağılım yaptığında portföy davranışının nasıl değiştiğini gözlemleyebilir. Bu deneyim, risk-getiri dengesini soyut bir kavram olmaktan çıkarır.",
          ],
        },
      },
      {
        eyebrow: "İleri Seviye",
        title: "Portföy Disiplini",
        paragraphs: [
          "Portföy disiplini, tek tek işlemlerden daha geniş bir bakış açısı gerektirir. Bir kullanıcının zaman zaman doğru kararlar vermesi önemlidir; fakat uzun vadeli tutarlılık, bu kararların belirli bir çerçeve içinde tekrar edilebilmesiyle oluşur.",
          "Enbilir’in portföy disiplini modülü, kullanıcının sadece “hangi varlık yükselir?” sorusuna odaklanmasını istemez. Bunun yerine daha güçlü sorular sorar: Portföyüm dengeli mi? Riskim belirli bir seviyede mi? Kazanan ve kaybeden kararlarımı gözden geçiriyor muyum? AI içgörülerini kendi yorumumla birlikte değerlendiriyor muyum? Kısa vadeli heyecan, uzun vadeli planımı bozuyor mu?",
          "Portföy disiplini, insan davranışını merkeze alır. Çünkü piyasada sorun çoğu zaman bilgi eksikliği kadar davranış kontrolüyle de ilgilidir. Kullanıcı doğru bilgiye sahip olsa bile, panik halinde yanlış karar verebilir. Kârdayken aşırı özgüvenli davranabilir. Zarardayken hatasını kabul etmek yerine daha fazla risk alabilir. Disiplin, bu davranışları yönetmenin yoludur.",
          "Bu modül kullanıcının kendi kararlarını düzenli şekilde değerlendirmesini teşvik eder. Hangi karar işe yaradı, hangisi yaramadı, neden? Sonuç şans mıydı, süreç doğru muydu? Portföy dağılımı bilinçli miydi, yoksa anlık hevesle mi oluştu? Bu sorular, kullanıcının zaman içinde daha güçlü bir yatırım okuryazarlığı geliştirmesine yardım eder.",
        ],
        lesson: {
          title: "Disiplinli Portföy Neden Uzun Vadede Kazanır?",
          paragraphs: [
            "Disiplinli portföy uzun vadede daha güçlüdür; çünkü tek bir büyük tahmine değil, tekrar edilebilir bir sürece dayanır. Piyasada kısa vadede şansın etkisi olabilir. Bir kullanıcı rastlantısal olarak doğru zamanda doğru varlığa yönelebilir. Ancak bu durum sürdürülebilir bir başarı modeli oluşturmaz.",
            "Uzun vadede farkı yaratan şey; dağılım, risk kontrolü, düzenli gözden geçirme, sabır ve kararların kayıt altına alınmasıdır. Disiplinli portföy, kullanıcının duygusal dalgalanmalara kapılmasını azaltır. Her yükselişte aşırı iyimser, her düşüşte aşırı karamsar olmasını engeller.",
            "Enbilir’de disiplinli portföy yaklaşımı, sanal deneyim üzerinden geliştirilebilir. Kullanıcı geçmiş kararlarını görebilir, performansını değerlendirebilir, AI içgörülerini okuyabilir ve diğer kullanıcılarla karşılaştırmalı bir öğrenme sürecine girebilir. Bu süreç, zamanla daha bilinçli bir karar alışkanlığı oluşturur.",
            "Disiplinli portföyün özü şudur: Önemli olan her zaman kazanmak değildir; önemli olan kayıplardan öğrenmek, riskleri sınırlamak ve karar kalitesini sürekli geliştirmektir.",
          ],
        },
        quiz: {
          title: "Mini Quiz: Uzun Vadeli Tutarlılığı Ne Üretir?",
          paragraphs: [
            "Uzun vadeli tutarlılığı üreten şey, her piyasa hareketine duygusal tepki vermek yerine, dağılımı, gözden geçirmeyi ve risk kontrolünü içeren tekrar edilebilir bir karar çerçevesidir.",
            "Kullanıcı bir plana sahip değilse, piyasa hareketleri onu sürekli yönlendirir. Yükselişte heyecanlanır, düşüşte panikler, yatay piyasada sabırsızlanır. Oysa bir çerçevesi varsa, her hareketi aynı soğukkanlılıkla değerlendirmeye başlar.",
            "Tutarlılık, tahmin yeteneğinden çok davranış disiplininin sonucudur. Enbilir’in eğitim yaklaşımı da kullanıcıya tam olarak bunu kazandırmayı hedefler.",
          ],
        },
        module: {
          title: "Portföy Disiplini Modül Detayı",
          paragraphs: [
            "Portföy disiplini modülü, Enbilir eğitim yapısının ileri aşamasıdır. Bu modülde kullanıcı, tekil işlemlerden çıkarak daha bütünlüklü bir portföy yaklaşımı geliştirmeye yönlendirilir.",
            "İlk bölümde karar kayıtları ve gözden geçirme alışkanlığı üzerinde durulur. Kullanıcıya yalnızca sonuçlara değil, karar sürecine de bakması gerektiği anlatılır. Bir işlem kazançla sonuçlandı diye süreç mutlaka doğru olmayabilir. Aynı şekilde zarar eden bir karar da her zaman hatalı süreç anlamına gelmeyebilir. Önemli olan, kararın hangi bilgiye, hangi varsayıma ve hangi risk çerçevesine dayandığını anlamaktır.",
            "İkinci bölümde dağılım ve tekrar edilebilirlik ele alınır. Kullanıcı, portföyün tek bir fikirden ibaret olmadığını; farklı varlıkların, nakit payının, risk sınırının ve zamanlamanın birlikte düşünülmesi gerektiğini öğrenir.",
            "Üçüncü bölümde AI içgörülerinin portföy disipliniyle nasıl birlikte kullanılabileceği anlatılır. AI Asistanı’nın sunduğu yorumlar, insan muhakemesinin yerine geçmez; kullanıcının daha iyi analiz yapmasına yardımcı olur. Bu yaklaşım, teknolojiyi sorumlu ve bilinçli kullanmanın temelidir.",
            "Portföy disiplini modülünün sonunda kullanıcıdan beklenen şey, mükemmel tahminler yapması değil; daha sakin, daha tutarlı ve daha ölçülü kararlar verebilmesidir.",
          ],
        },
      },
    ],
    glossaryTitle: "Kullanıcının Platform İçinde Sık Göreceği Kavramlar",
    glossaryParagraphs: [
      "Enbilir’de kullanıcıların sık karşılaşacağı bazı kavramlar vardır. Bu kavramların doğru anlaşılması, platform deneyimini çok daha verimli hale getirir. Çünkü kullanıcı sanal portföy oluştururken, AI Asistanı’nı incelerken, liderlik tablosuna bakarken veya eğitim içeriklerini takip ederken bu terimlerle tekrar tekrar karşılaşır.",
      "Temel terimler bölümü, teknik sözlük gibi kuru bir anlatım sunmaz. Her kavramın platform içindeki pratik karşılığını açıklar. Amaç, kullanıcının yalnızca kelimenin tanımını bilmesi değil, o kavramı karar sürecinde nasıl kullanacağını da anlamasıdır.",
      "Finansal okuryazarlıkta kavramlar pusula gibidir. Pusula doğru çalışmazsa, kişi çok hareket eder ama doğru yöne gidemez. Bu nedenle sanal bakiye, çeşitlendirme, geri çekilme ve sinyal güveni gibi kavramlar Enbilir deneyiminin temel taşlarıdır.",
    ],
    glossaryItems: [
      {
        term: "Sanal Bakiye",
        paragraphs: [
          "Sanal bakiye, kullanıcının gerçek birikimini riske atmadan öğrenme deneyimine başlaması için verilen simülasyon sermayesidir. Bu bakiye gerçek para değildir; alım-satım denemeleri, portföy oluşturma, performans izleme ve sıralama deneyimi için kullanılır.",
          "Sanal bakiyenin en önemli işlevi, kullanıcıya güvenli bir başlangıç alanı sağlamasıdır. Gerçek para kullanılmadığı için kullanıcı piyasayı daha rahat keşfedebilir. Farklı varlıklara yönelmenin portföy üzerindeki etkisini görebilir. Riskli kararların sonucunu deneyimleyebilir. Nakit tutmanın, dağılım yapmanın ve zamanlamanın önemini daha somut şekilde anlayabilir.",
          "Ancak sanal bakiye ciddiyetsiz bir oyun parası gibi görülmemelidir. Tam tersine, doğru kullanıldığında gerçek hayattaki finansal kararlar için önemli bir prova alanı oluşturur. Kullanıcı sanal bakiyesini bilinçli yönetirse, finansal davranışlarını daha iyi tanır.",
        ],
      },
      {
        term: "Çeşitlendirme",
        paragraphs: [
          "Çeşitlendirme, sermayeyi tek bir fikre veya tek bir varlığa bağlamak yerine, farklı alanlara dağıtma yaklaşımıdır. Bu yaklaşımın temel amacı, portföyün tek bir gelişmeye aşırı bağımlı hale gelmesini önlemektir.",
          "Bir kullanıcı tüm sanal bakiyesini tek bir varlığa yönlendirdiğinde, o varlığın hareketi portföyün tamamını belirler. Eğer beklenti doğru çıkarsa yüksek kazanç görülebilir; fakat beklenti bozulursa geri çekilme de sert olabilir. Çeşitlendirme, bu etkiyi dengelemeye yardımcı olur.",
          "Çeşitlendirme her riski ortadan kaldırmaz. Bu yanlış anlaşılmamalıdır. Ancak riskin daha yönetilebilir hale gelmesini sağlar. Kullanıcı farklı varlıklar, farklı temalar veya farklı zaman aralıkları arasında daha dengeli bir yapı kurabilir.",
          "Enbilir’de çeşitlendirme, sanal portföy üzerinde kolayca gözlemlenebilir. Kullanıcı dağılımını değiştirdikçe portföy davranışının nasıl farklılaştığını görebilir. Bu da teorik bir kavramı pratik bir öğrenme deneyimine dönüştürür.",
        ],
      },
      {
        term: "Geri Çekilme",
        paragraphs: [
          "Geri çekilme, portföyün veya bir varlığın ulaştığı daha yüksek bir seviyeden aşağı yönlü hareket etmesini ifade eder. Bu kavram, kullanıcının sadece kazanca değil, düşüş dönemlerine de hazırlıklı olması gerektiğini hatırlatır.",
          "Piyasada yükselişler kadar geri çekilmeler de doğaldır. Önemli olan her düşüşte paniklemek değil, geri çekilmenin boyutunu, nedenini ve portföy üzerindeki etkisini değerlendirebilmektir. Bazı geri çekilmeler kısa vadeli dalgalanma olabilir; bazıları ise daha büyük bir riskin işareti olabilir.",
          "Geri çekilme kavramını anlayan kullanıcı, portföyünü daha gerçekçi değerlendirir. Sadece “ne kadar kazandım?” sorusunu değil, “bu kazanç hangi dalgalanmayla geldi?” sorusunu da sorar. Çünkü iki portföy aynı getiriyi üretse bile, birinin yaşadığı geri çekilme diğerinden çok daha yüksek olabilir. Bu da risk kalitesi açısından önemli bir farktır.",
          "Enbilir’de geri çekilme kavramı, kullanıcının portföy disiplinini geliştirmesi için temel göstergelerden biridir.",
        ],
      },
      {
        term: "Sinyal Güveni",
        paragraphs: [
          "Sinyal güveni, AI Asistanı tarafından üretilen bir piyasa yorumunun teknik verilerle ne kadar uyumlu göründüğünü ifade eder. Bu kavram, kullanıcının yapay zekâ destekli içgörüleri daha bilinçli değerlendirmesine yardımcı olur.",
          "Sinyal güveni yüksek olduğunda, ilgili yorumun belirli göstergelerle daha tutarlı olduğu düşünülebilir. Ancak bu, sonucun kesin olduğu anlamına gelmez. Finansal piyasalarda hiçbir sinyal tek başına garanti vermez. Sinyal güveni, karar sürecinde dikkate alınabilecek bir yardımcı ölçüdür; kararın kendisi değildir.",
          "Kullanıcı sinyal güvenini okurken zaman aralığına, piyasa koşullarına, volatiliteye ve kendi portföyündeki risk yapısına da bakmalıdır. Örneğin kısa vadeli güçlü bir sinyal, uzun vadeli bir portföy stratejisiyle her zaman uyumlu olmayabilir. Benzer şekilde, teknik olarak olumlu görünen bir yapı, ani haber akışıyla geçerliliğini kaybedebilir.",
          "Bu nedenle Enbilir’de sinyal güveni, kullanıcıya tek başına yön vermek için değil, daha iyi soru sordurmak için kullanılır. “Bu sinyal neden oluştu?”, “Hangi veriler bunu destekliyor?”, “Hangi durumda bu görüş zayıflar?” gibi sorular, kullanıcıyı daha bilinçli bir noktaya taşır.",
        ],
      },
    ],
  };
}

function getEducationGrowthSteps(locale: string) {
  if (locale === "en") {
    return [
      { step: "01", title: "Read the concept", body: "Start with simple explanations and shared vocabulary.", href: "/en/egitim" },
      { step: "02", title: "Test virtually", body: "Apply the idea in the virtual portfolio without real-money risk.", href: "/en/islem-yap" },
      { step: "03", title: "Discuss in league", body: "Turn the same concept into a club conversation.", href: "/en/ligler" },
      { step: "04", title: "Review with AI", body: "Use macro reports and the assistant to connect learning with live context.", href: "/en/ai-piyasa-asistani" },
    ] as const;
  }

  return [
    { step: "01", title: "Kavramı oku", body: "Sade anlatımla ortak dili kur.", href: "/tr/egitim" },
    { step: "02", title: "Sanal dene", body: "Fikri gerçek para riski olmadan portföyde uygula.", href: "/tr/islem-yap" },
    { step: "03", title: "Ligde tartış", body: "Aynı kavramı kulüp sohbetine dönüştür.", href: "/tr/ligler" },
    { step: "04", title: "AI ile gözden geçir", body: "Makro rapor ve asistanla canlı bağlama bağla.", href: "/tr/ai-piyasa-asistani" },
  ] as const;
}
