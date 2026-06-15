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
  const learningTracks = getLearningTracks(locale);
  const outcomes = getEducationOutcomes(locale);
  const learningLevels = getLearningLevels(locale);
  const glossaryItems = getGlossaryItems(locale);

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="premium-card premium-card--interactive p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
            {locale === "tr" ? "Öğrenme tasarımı" : "Learning design"}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "Rotary topluluğu için kısa, uygulanabilir ve tekrar edilebilir eğitim akışları." : "Short, practical, and repeatable learning flows for Rotary communities."}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {learningTracks.map((track) => (
              <div key={track.title} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#0f766e]">{track.eyebrow}</p>
                <h3 className="mt-2 text-lg font-black text-[#152033]">{track.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{track.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="premium-card premium-card--dark p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5a623]">
            {locale === "tr" ? "Beklenen çıktı" : "Expected outcomes"}
          </p>
          <div className="mt-4 grid gap-3">
            {outcomes.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-black text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        {learningLevels.map((level) => (
          <article key={level.title} className="premium-card premium-card--interactive p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{level.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">{level.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{level.description}</p>
            <div className="mt-4 grid gap-3">
              {level.lessons.map((lesson) => (
                <div key={lesson.title} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
                  <p className="text-sm font-black text-[#152033]">{lesson.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.body}</p>
                  <div className="mt-3 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-800">
                    {lesson.format}
                  </div>
                  <ul className="mt-3 grid gap-1 text-sm text-slate-600">
                    {lesson.points.map((point) => <li key={point}>• {point}</li>)}
                  </ul>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{locale === "tr" ? "Mini quiz" : "Mini quiz"}</p>
                    <p className="mt-2 text-sm font-black text-[#152033]">{lesson.quiz.question}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.quiz.answer}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">
                      {locale === "tr" ? "Tamamlama rozeti" : "Completion badge"}
                    </span>
                    <span className="text-sm font-black text-amber-900">{lesson.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {locale === "tr" ? "Temel Terimler" : "Core terms"}
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#152033]">
          {locale === "tr" ? "Kullanıcının platform içinde sık göreceği kavramlar" : "The concepts users will see often across the platform"}
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {glossaryItems.map((item) => (
            <article key={item.term} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
              <h3 className="text-sm font-black text-[#152033]">{item.term}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.definition}</p>
            </article>
          ))}
        </div>
      </section>
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

function getGlossaryItems(locale: string) {
  if (locale === "en") {
    return [
      {
        term: "Virtual balance",
        definition: "The starting simulated capital given to the user so they can learn without exposing real savings.",
      },
      {
        term: "Diversification",
        definition: "Spreading capital across multiple assets instead of relying on one idea alone.",
      },
      {
        term: "Drawdown",
        definition: "The decline from a portfolio peak to a lower point; it helps users understand downside pressure.",
      },
      {
        term: "Signal confidence",
        definition: "A measure of how strongly the current technical inputs align with the AI signal being shown.",
      },
    ] as const;
  }

  return [
    {
      term: "Sanal bakiye",
      definition: "Kullanıcıya gerçek birikimini riske atmadan öğrenmesi için verilen başlangıç simülasyon sermayesidir.",
    },
    {
      term: "Çeşitlendirme",
      definition: "Sermayeyi tek bir fikre bağlamak yerine birden fazla varlığa dağıtma yaklaşımıdır.",
    },
    {
      term: "Geri çekilme",
      definition: "Portföyün zirveden daha alt bir seviyeye inişini ifade eder; aşağı yön baskısını anlamaya yardım eder.",
    },
    {
      term: "Sinyal güveni",
      definition: "Gösterilen AI sinyalinin teknik verilerle ne kadar uyumlu göründüğünü anlatan ölçüdür.",
    },
  ] as const;
}

function getLearningLevels(locale: string) {
  if (locale === "en") {
    return [
      {
        eyebrow: "Beginner",
        title: "Core concepts",
        description: "Start with the language of price, trend, and allocation so new users do not feel lost.",
        lessons: [
          {
            title: "What is a virtual portfolio?",
            body: "A virtual portfolio mirrors real market movement without placing real orders. It lets users test decision quality safely.",
            format: "3 min video + 1 infographic",
            points: ["Why simulation lowers anxiety", "How balance and positions work", "What rankings really measure"],
            quiz: {
              question: "Why is a virtual portfolio useful for beginners?",
              answer: "Because it creates a safe environment to practice decision-making before any real financial risk exists.",
            },
            badge: "First Steps",
          },
        ],
      },
      {
        eyebrow: "Intermediate",
        title: "Risk and return",
        description: "Teach users how upside and downside travel together and why discipline matters more than guessing.",
        lessons: [
          {
            title: "How is risk managed?",
            body: "Risk management starts with position size, cash protection, and understanding that every move has a downside scenario.",
            format: "4 min video + scenario card",
            points: ["Why all capital should not go into one asset", "How to think about drawdown", "Why patience is a strategic choice"],
            quiz: {
              question: "What is the first sign of poor risk management?",
              answer: "Putting too much capital into a single idea without leaving room for uncertainty.",
            },
            badge: "Risk Aware",
          },
        ],
      },
      {
        eyebrow: "Advanced",
        title: "Portfolio discipline",
        description: "Move from isolated trades to repeatable behavior patterns supported by data and reflection.",
        lessons: [
          {
            title: "Why does a disciplined portfolio win over time?",
            body: "Because repeatable process beats emotional reaction. Good portfolios are not built from one great trade but from a consistent framework.",
            format: "5 min video + checklist visual",
            points: ["Scenario thinking", "Reviewing winners and losers", "Connecting AI insights with human judgment"],
            quiz: {
              question: "What creates long-term consistency?",
              answer: "A repeatable framework for allocation, review, and risk control instead of emotional reaction to every move.",
            },
            badge: "Portfolio Builder",
          },
        ],
      },
    ] as const;
  }

  return [
    {
      eyebrow: "Başlangıç",
      title: "Temel kavramlar",
      description: "Yeni kullanıcı kaybolmadan başlasın diye fiyat, trend ve dağılım dilini ortak zemine oturtur.",
      lessons: [
        {
          title: "Sanal portföy nedir?",
          body: "Sanal portföy, gerçek emir göndermeden piyasa hareketini takip eden eğitim amaçlı portföydür. Kullanıcıya güvenli deneme alanı sağlar.",
          format: "3 dk video + 1 infografik",
          points: ["Simülasyon neden kaygıyı azaltır", "Bakiye ve pozisyon mantığı nasıl çalışır", "Sıralama gerçekten neyi ölçer"],
          quiz: {
            question: "Sanal portföy yeni başlayanlar için neden faydalıdır?",
            answer: "Çünkü gerçek finansal risk oluşmadan karar pratiği yapılabilecek güvenli bir alan sunar.",
          },
          badge: "İlk Adımlar",
        },
      ],
    },
    {
      eyebrow: "Orta",
      title: "Risk ve getiri",
      description: "Yukarı yönlü potansiyel ile aşağı yönlü riskin birlikte geldiğini ve disiplinin tahminden daha değerli olduğunu öğretir.",
      lessons: [
        {
          title: "Risk yönetimi nasıl kurulur?",
          body: "Risk yönetimi; pozisyon büyüklüğü, nakit koruması ve her kararın olası kötü senaryosunu baştan düşünmekle başlar.",
          format: "4 dk video + senaryo kartı",
          points: ["Neden tüm sermaye tek ürüne gitmemeli", "Geri çekilme nasıl düşünülür", "Sabır neden stratejik bir tercihtir"],
          quiz: {
            question: "Zayıf risk yönetiminin ilk işareti nedir?",
            answer: "Belirsizlik payı bırakmadan tek bir fikre aşırı büyük sermaye bağlamaktır.",
          },
          badge: "Risk Farkındalığı",
        },
      ],
    },
    {
      eyebrow: "İleri",
      title: "Portföy disiplini",
      description: "Tekil işlemlerden çıkıp veriye ve değerlendirmeye dayalı tekrar edilebilir davranış kalıpları kurdurur.",
      lessons: [
        {
          title: "Disiplinli portföy neden uzun vadede kazanır?",
          body: "Çünkü tekrarlanabilir süreç, duygusal reaksiyondan daha güçlüdür. İyi portföy tek büyük işlemden değil, tutarlı çerçeveden doğar.",
          format: "5 dk video + kontrol listesi",
          points: ["Senaryo düşüncesi", "Kazanan ve kaybeden işlemleri gözden geçirme", "AI içgörüsünü insan yorumu ile birleştirme"],
          quiz: {
            question: "Uzun vadeli tutarlılığı ne üretir?",
            answer: "Her harekete duygusal tepki vermek yerine; dağılım, gözden geçirme ve risk kontrolü olan tekrar edilebilir bir çerçeve.",
          },
          badge: "Portföy Mimarı",
        },
      ],
    },
  ] as const;
}

function getLearningTracks(locale: string) {
  if (locale === "en") {
    return [
      {
        eyebrow: "Track 1",
        title: "Market literacy foundations",
        body: "Build a common language around price, trend, volatility, and risk so community members start from the same ground.",
      },
      {
        eyebrow: "Track 2",
        title: "Virtual portfolio discipline",
        body: "Teach allocation logic, cash management, and scenario comparison through action instead of theory alone.",
      },
      {
        eyebrow: "Track 3",
        title: "AI-assisted interpretation",
        body: "Use the assistant to understand why signals appear, when to stay cautious, and how to read indicators together.",
      },
    ] as const;
  }

  return [
    {
      eyebrow: "Rota 1",
      title: "Piyasa okuryazarlığı temeli",
      body: "Fiyat, trend, volatilite ve risk etrafında ortak bir dil kurarak topluluğun aynı zeminde başlamasını sağlar.",
    },
    {
      eyebrow: "Rota 2",
      title: "Sanal portföy disiplini",
      body: "Dağılım mantığı, nakit yönetimi ve senaryo kıyasını sadece teoriyle değil uygulamayla öğretir.",
    },
    {
      eyebrow: "Rota 3",
      title: "AI destekli yorumlama",
      body: "Asistanı kullanarak sinyalin neden oluştuğunu, ne zaman temkinli kalınacağını ve göstergelerin nasıl okunacağını birlikte kavratır.",
    },
  ] as const;
}

function getEducationOutcomes(locale: string) {
  if (locale === "en") {
    return [
      {
        title: "Faster onboarding",
        body: "New members can understand the product logic quickly without waiting for one-to-one explanation.",
      },
      {
        title: "More consistent language",
        body: "The whole community starts speaking about markets with clearer, less intimidating concepts.",
      },
      {
        title: "Stronger continuity",
        body: "Education no longer feels separate from the rest of the platform; it supports trading, rankings, and AI insights.",
      },
    ] as const;
  }

  return [
    {
      title: "Daha hızlı onboarding",
      body: "Yeni üyeler ürünü birebir anlatım beklemeden daha kısa sürede kavrar.",
    },
    {
      title: "Daha tutarlı bir dil",
      body: "Topluluk piyasayı daha net ve ürkütmeyen kavramlarla konuşmaya başlar.",
    },
    {
      title: "Daha güçlü devamlılık",
      body: "Eğitim, platformun geri kalanından kopuk kalmaz; işlem, sıralama ve AI içgörülerini besler.",
    },
  ] as const;
}
