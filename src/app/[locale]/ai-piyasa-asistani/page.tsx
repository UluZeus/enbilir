import Link from "next/link";
import type { Metadata } from "next";
import { AiMarketChatPanel } from "@/components/ai-market/AiMarketChatPanel";
import { AiScenarioLab } from "@/components/ai-market/AiScenarioLab";
import { MarketAssistantDashboard } from "@/components/ai-market/MarketAssistantDashboard";
import { getSessionUser } from "@/lib/auth";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { AI_MARKET_SYMBOLS } from "@/lib/ai-market/symbols";
import { getMembershipSnapshot, membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/ai-piyasa-asistani", page: "ai" });
}

export default async function AiMarketAssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const isEnglish = locale === "en";
  const copy = getUiCopy(locale).ai;
  const guidance = getAiGuidance(locale);
  const commandMetrics = getCommandMetrics(locale);
  const reportSlots = getReportSlots(locale);
  const decisionCards = getDecisionCards(locale);
  const user = await getSessionUser();
  const fullUser = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { createdAt: true, membershipTier: true, vipPaidUntil: true },
      })
    : null;
  const membership = fullUser ? getMembershipSnapshot(fullUser) : null;
  const latestReport = await prisma.aiMarketReport.findFirst({
    where: user ? { OR: [{ userId: user.id }, { scope: "GLOBAL" }] } : { scope: "GLOBAL" },
    orderBy: { generatedAt: "desc" },
    select: { id: true, generatedAt: true, marketRegime: true, riskAppetite: true, fallbackUsed: true },
  });

  return (
    <div className="ai-premium-page min-h-screen px-3 py-4 md:px-5">
      <section className="ai-command-center mx-auto mb-4 grid max-w-[1600px] gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="ai-command-hero rounded-[1.7rem] border border-slate-800 bg-[#07101d] p-5 text-white shadow-2xl md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d1bfa7]">
            {locale === "tr" ? "AI rehberi" : "AI guide"}
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black md:text-5xl">{copy.terminal}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300 md:text-base md:leading-8">
            {locale === "tr"
              ? "Bu ekran sinyal kovalamak için değil, piyasa davranışını yorumlamayı öğrenmek için tasarlandı. Teknik veri, haber akışı, favori varlıklar ve planlı makro raporları aynı masaya koyarak daha bilinçli bir piyasa okuryazarlığı ritmi kurar."
              : "This screen is designed to learn how to interpret market behavior, not to chase signals. It brings technical data, news flow, favorite assets, and scheduled macro reports into one disciplined market-literacy rhythm."}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {commandMetrics.map((item) => (
              <div key={item.label} className="ai-command-metric rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-2xl font-black text-white">{item.value}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#d1bfa7]">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {guidance.map((item) => (
              <div key={item.title} className="ai-guide-card rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="ai-guide-card-title text-sm font-black text-white">{item.title}</p>
                <p className="ai-guide-card-body mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="ai-decision-strip mt-5 grid gap-3 md:grid-cols-3">
            {decisionCards.map((item) => (
              <div key={item.title} className="ai-decision-card rounded-2xl p-4">
                <span className="ai-decision-index">{item.index}</span>
                <p className="mt-3 text-sm font-black text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              {locale === "tr" ? "Bu sinyali nasıl okumalıyım?" : "How should I read the signal?"}
            </p>
            <p className="mt-2 text-sm leading-6 text-cyan-50">
              {locale === "tr"
                ? "AL, SAT, bekle veya izle etiketleri emir değildir. Önce trend, hacim, risk skoru, vade ve kendi sanal portföy dağılımın aynı şeyi söylüyor mu diye kontrol et."
                : "BUY, SELL, hold, or watch labels are not orders. First check whether trend, volume, risk score, time frame, and your virtual portfolio allocation tell the same story."}
            </p>
          </div>
        </div>
        <div className="ai-usage-panel rounded-[1.7rem] border border-emerald-400/18 bg-emerald-400/8 p-5 text-white shadow-2xl">
          <p className="ai-usage-kicker text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">
            {locale === "tr" ? "Planlı rapor ritmi" : "Scheduled report rhythm"}
          </p>
          <div className="mt-4 grid gap-3">
            {reportSlots.map((slot) => (
              <div key={slot.time} className="ai-usage-card rounded-2xl border border-white/8 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="ai-usage-title text-sm font-black">{slot.title}</p>
                  <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-xs font-black text-[#d1bfa7]">{slot.time}</span>
                </div>
                <p className="ai-usage-body mt-2 text-sm leading-6 text-slate-300">{slot.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="ai-latest-report-card mx-auto mb-4 max-w-[1600px] rounded-[1.25rem] border border-cyan-300/20 bg-cyan-300/8 p-4 text-white shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">{isEnglish ? "Scheduled AI agent report" : "Planlı AI ajan raporu"}</p>
            {latestReport ? (
              <>
                <h2 className="mt-1 text-lg font-black">
                  {isEnglish ? "Latest market report is ready" : latestReport.marketRegime ?? "Son piyasa raporu hazır"}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  {new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(latestReport.generatedAt)}
                  {latestReport.riskAppetite && !isEnglish ? ` · ${latestReport.riskAppetite}` : ""}
                  {isEnglish ? " · macro context available" : ""}
                  {latestReport.fallbackUsed ? " · fallback" : ""}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-1 text-lg font-black">{isEnglish ? "The first report will appear after the scheduled job runs" : "İlk rapor planlı görev çalıştığında oluşacak"}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  {isEnglish
                    ? "The macro basket, news flow, and favorite assets will be reviewed in scheduled reports."
                    : "Makro sepet, haberler ve favori varlıklar planlı raporlarda yorumlanacak."}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {latestReport ? (
              <Link href={`/${locale}/ai-piyasa-asistani/raporlar/${latestReport.id}`} className="ai-report-primary-action rounded-md border border-cyan-200 bg-cyan-100 px-3 py-2 text-sm font-black text-slate-950">
                {isEnglish ? "Open latest report" : "Son raporu aç"}
              </Link>
            ) : null}
            <Link href={`/${locale}/ai-piyasa-asistani/raporlar`} className="rounded-md border border-white/15 bg-white/8 px-3 py-2 text-sm font-black text-white">
              {isEnglish ? "All reports" : "Tüm raporlar"}
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto mb-4 grid max-w-[1600px] gap-3 md:grid-cols-3">
        {[
          {
            title: isEnglish ? "Standard AI chat" : "Standart AI sohbet",
            body: isEnglish
              ? "Answers from the site's market data, portfolio context, reports, and educational content. It stays inside Enbilir's own topic area."
              : "Sitenin piyasa verisi, portföy bağlamı, raporları ve eğitim içerikleri üzerinden cevap verir. Enbilir'in konu alanı içinde kalır.",
          },
          {
            title: isEnglish ? "VIP AI agent" : "VIP AI ajan",
            body: isEnglish
              ? "Designed for broader web/news synthesis when the user has an active VIP membership and the external data connectors are available."
              : "Aktif VIP üyelikte, dış veri bağlantıları uygunsa daha geniş web/haber derlemesi yapacak üst seviye ajan mantığı için ayrılmıştır.",
          },
          {
            title: isEnglish ? "Education first" : "Önce eğitim",
            body: isEnglish
              ? "Outputs are market-literacy context, not investment advice or an automatic buy/sell order."
              : "Üretilen cevaplar yatırım tavsiyesi veya otomatik al/sat emri değil, finansal okuryazarlık bağlamıdır.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-[1.15rem] border border-white/10 bg-[#07101d] p-4 text-white shadow-xl">
            <p className="text-sm font-black text-[#d1bfa7]">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
          </div>
        ))}
      </section>
      <AiScenarioLab locale={locale} />
      <AiMarketChatPanel
        locale={locale}
        membershipTier={membership?.effectiveTier ?? "STANDARD"}
        vipPaidUntil={membership?.vipPaidUntil?.toISOString() ?? null}
        standardPaymentLink={membershipConfig.standardPaymentLink}
        vipPaymentLink={membershipConfig.vipPaymentLink}
      />
      <MarketAssistantDashboard locale={locale} symbols={AI_MARKET_SYMBOLS} />
    </div>
  );
}

function getDecisionCards(locale: string) {
  if (locale === "en") {
    return [
      {
        index: "01",
        title: "Signal is not an order",
        body: "Buy/sell labels are learning cues. Confirm them with trend, volume, risk, and macro context.",
      },
      {
        index: "02",
        title: "Favorites get deeper context",
        body: "Assets you follow are interpreted one by one in macro reports and terminal summaries.",
      },
      {
        index: "03",
        title: "Discuss before deciding",
        body: "Use the output to ask better questions inside your league, not to outsource judgement.",
      },
    ] as const;
  }

  return [
    {
      index: "01",
      title: "Sinyal emir değildir",
      body: "AL/SAT etiketleri öğrenme ipucudur. Trend, hacim, risk ve makro bağlamla doğrula.",
    },
    {
      index: "02",
      title: "Favoriler daha derin okunur",
      body: "Takip ettiğin varlıklar makro raporlarda ve terminal özetlerinde tek tek yorumlanır.",
    },
    {
      index: "03",
      title: "Karardan önce tartış",
      body: "Çıktıyı karar devretmek için değil, lig içinde daha iyi sorular sormak için kullan.",
    },
  ] as const;
}

function getCommandMetrics(locale: string) {
  if (locale === "en") {
    return [
      { value: "1h", label: "Live terminal", body: "Focuses on the active asset with indicators, radar, and confidence context." },
      { value: "3x", label: "Macro reports", body: "Creates a broader market read at 07:00, 12:00, and 18:00 Türkiye time." },
      { value: "AI", label: "Learning agent", body: "Explains signals as educational context, never as automatic trade orders." },
    ] as const;
  }

  return [
    { value: "1 sa", label: "Canlı terminal", body: "Odak varlığı gösterge, radar ve güven bağlamıyla birlikte okutur." },
    { value: "3x", label: "Makro rapor", body: "Türkiye saatiyle 07.00, 12.00 ve 18.00'de daha geniş piyasa okuması üretir." },
    { value: "AI", label: "Öğrenme ajanı", body: "Sinyalleri otomatik emir değil, eğitim bağlamı olarak açıklar." },
  ] as const;
}

function getReportSlots(locale: string) {
  if (locale === "en") {
    return [
      { time: "07:00", title: "Morning macro frame", body: "Starts the day with overnight news, Asia/US close, metals, FX, and energy context." },
      { time: "12:00", title: "Midday reset", body: "Refreshes the picture after European flow and early Türkiye market behavior." },
      { time: "18:00", title: "Evening decision note", body: "Collects the day into a calmer summary before the next morning cycle." },
    ] as const;
  }

  return [
    { time: "07.00", title: "Sabah makro çerçeve", body: "Gece haberleri, Asya/ABD kapanışı, metaller, döviz ve enerji bağlamıyla günü açar." },
    { time: "12.00", title: "Öğlen güncellemesi", body: "Avrupa akışı ve Türkiye piyasasının ilk yarısı sonrasında resmi tazeler." },
    { time: "18.00", title: "Akşam karar notu", body: "Günü daha sakin bir özetle toparlar ve bir sonraki sabah döngüsüne bağlar." },
  ] as const;
}

function getAiGuidance(locale: string) {
  if (locale === "en") {
    return [
      {
        title: "Start with the radar",
        body: "Let the radar show where the market is moving, then narrow the conversation to a few meaningful assets.",
      },
      {
        title: "Read the summary, then the chart",
        body: "Teach users to compare the AI explanation with the visible indicator context instead of trusting a single box.",
      },
      {
        title: "Turn it into a learning ritual",
        body: "Use the screen in weekly Rotary sessions to review what changed, why it changed, and how the portfolio reacted.",
      },
    ] as const;
  }

  return [
    {
      title: "Önce radar ile başla",
      body: "Radar piyasanın nereye hareket ettiğini göstersin; ardından sohbeti birkaç anlamlı varlık üstüne daralt.",
    },
    {
      title: "Önce özeti, sonra grafiği oku",
      body: "Kullanıcının tek bir kutuya güvenmesini değil, AI açıklamasını görünür teknik bağlamla kıyaslamasını öğret.",
    },
    {
      title: "Bunu bir öğrenme ritüeline çevir",
      body: "Haftalık Rotary oturumlarında bu ekranla ne değişti, neden değişti ve portföy nasıl tepki verdi sorularını tartış.",
    },
  ] as const;
}
