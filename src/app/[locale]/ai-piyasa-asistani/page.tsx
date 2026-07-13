import Link from "next/link";
import type { Metadata } from "next";
import { AiMarketChatPanel } from "@/components/ai-market/AiMarketChatPanel";
import { AiScenarioLab } from "@/components/ai-market/AiScenarioLab";
import { MarketAssistantDashboard } from "@/components/ai-market/MarketAssistantDashboard";
import { OnboardingVisitTracker } from "@/components/onboarding/OnboardingVisitTracker";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getSessionUser } from "@/lib/auth";
import { getLocalizedAiMarketSymbols } from "@/lib/ai-market/symbols";
import { getMembershipSnapshot, membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";

const tabs = ["summary", "terminal", "chat", "reports"] as const;
type AiTab = (typeof tabs)[number];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/ai-piyasa-asistani", page: "ai" });
}

export default async function AiMarketAssistantPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const isEnglish = locale === "en";
  const activeTab = tabs.includes(query.tab as AiTab) ? query.tab as AiTab : "summary";
  const copy = getUiCopy(locale).ai;
  const user = await getSessionUser();
  const [fullUser, latestReport] = await Promise.all([
    user ? prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true, membershipTier: true, vipPaidUntil: true } }) : null,
    prisma.aiMarketReport.findFirst({
      where: user ? { OR: [{ userId: user.id }, { scope: "GLOBAL" }] } : { scope: "GLOBAL" },
      orderBy: { generatedAt: "desc" },
      select: { id: true, generatedAt: true, marketRegime: true, riskAppetite: true },
    }),
  ]);
  const membership = fullUser ? getMembershipSnapshot(fullUser) : null;

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4">
      {user ? <OnboardingVisitTracker step={activeTab === "chat" ? "chat" : "assistant"} locale={locale} /> : null}
      <section className="rounded-lg border border-slate-800 bg-[#07101d] p-5 text-white shadow-xl md:p-7">
        <p className="text-xs font-black uppercase text-[#d1bfa7]">{isEnglish ? "AI market workspace" : "AI piyasa çalışma alanı"}</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">{copy.terminal}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
          {isEnglish
            ? "Start with the summary, open the terminal for detail, and use chat to question the evidence. AI output is educational context, never an automatic order."
            : "Özetle başla, ayrıntı için terminali aç ve kanıtı sorgulamak için sohbeti kullan. AI çıktısı eğitim bağlamıdır; otomatik işlem emri değildir."}
        </p>
      </section>

      <nav className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4" aria-label={isEnglish ? "AI workspace tabs" : "AI çalışma alanı sekmeleri"}>
        {getTabLabels(locale).map((tab) => (
          <Link key={tab.id} href={`/${locale}/ai-piyasa-asistani?tab=${tab.id}`} style={activeTab === tab.id ? { color: "#fffaf6" } : undefined} className={`flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-black ${activeTab === tab.id ? "bg-[#101827]" : "text-slate-700 hover:bg-slate-100"}`}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "summary" ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            {getSummaryCards(locale).map((item) => (
              <Link key={item.title} href={`/${locale}/ai-piyasa-asistani?tab=${item.href}`} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0f766e] hover:shadow-md">
                <p className="text-xs font-black uppercase text-[#0f766e]">{item.kicker}</p>
                <h2 className="mt-2 text-lg font-black text-[#152033]">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                <p className="mt-4 text-sm font-black text-[#0f766e]">{item.action}</p>
              </Link>
            ))}
          </section>
          <LatestReport locale={locale} report={latestReport} />
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="text-lg font-black">{isEnglish ? "A clear boundary" : "Net kullanım sınırı"}</h2>
            <p className="mt-2 text-sm leading-6">{isEnglish ? "BUY, SELL, wait, confidence, and risk labels are learning cues. Compare trend, volume, time frame, macro context, and your virtual allocation before forming a view." : "AL, SAT, bekle, güven ve risk etiketleri öğrenme ipuçlarıdır. Görüş oluşturmadan önce trendi, hacmi, vadeyi, makro bağlamı ve sanal portföy dağılımını birlikte değerlendir."}</p>
          </section>
        </>
      ) : null}

      {activeTab === "terminal" ? (
        <section className="min-w-0">
          <MarketAssistantDashboard locale={locale} symbols={getLocalizedAiMarketSymbols(locale)} />
        </section>
      ) : null}

      {activeTab === "chat" ? (
        <div className="grid gap-4">
          <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-5 text-cyan-950">
            <h2 className="text-lg font-black">{isEnglish ? "Ask questions that improve judgement" : "Karar kalitesini artıran sorular sor"}</h2>
            <p className="mt-2 text-sm leading-6">{isEnglish ? "Try: What evidence supports this view? What could invalidate it? How would a shorter time frame change the risk?" : "Şunları dene: Bu görüşü hangi kanıt destekliyor? Hangi durumda geçersiz olur? Daha kısa vade riski nasıl değiştirir?"}</p>
          </section>
          <AiScenarioLab locale={locale} />
          <AiMarketChatPanel locale={locale} membershipTier={membership?.effectiveTier ?? "STANDARD"} vipPaidUntil={membership?.vipPaidUntil?.toISOString() ?? null} standardPaymentLink={membershipConfig.standardPaymentLink} vipPaymentLink={membershipConfig.vipPaymentLink} />
        </div>
      ) : null}

      {activeTab === "reports" ? (
        <div className="grid gap-4">
          <LatestReport locale={locale} report={latestReport} />
          <Link href={`/${locale}/ai-piyasa-asistani/raporlar`} className="premium-cta inline-flex w-fit px-5 py-3 text-sm font-black">{isEnglish ? "Open report archive" : "Rapor arşivini aç"}</Link>
        </div>
      ) : null}
    </div>
  );
}

function LatestReport({ locale, report }: { locale: "tr" | "en"; report: { id: string; generatedAt: Date; marketRegime: string | null; riskAppetite: string | null } | null }) {
  const isEnglish = locale === "en";
  return (
    <section className="rounded-lg border border-cyan-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase text-[#0f766e]">{isEnglish ? "Latest scheduled report" : "Son planlı rapor"}</p>
      <h2 className="mt-2 text-xl font-black text-[#152033]">{report ? (isEnglish ? "The latest market report is ready" : report.marketRegime ?? "Son piyasa raporu hazır") : (isEnglish ? "No report has been generated yet" : "Henüz rapor oluşturulmadı")}</h2>
      {report ? <p className="mt-2 text-sm text-slate-600">{new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(report.generatedAt)}{report.riskAppetite ? ` · ${isEnglish ? "risk context available" : report.riskAppetite}` : ""}</p> : null}
      {report ? <Link href={`/${locale}/ai-piyasa-asistani/raporlar/${report.id}`} className="mt-4 inline-flex rounded-md border border-[#0f766e] px-4 py-2 text-sm font-black text-[#0f766e]">{isEnglish ? "Read report" : "Raporu oku"}</Link> : null}
    </section>
  );
}

function getTabLabels(locale: "tr" | "en"): Array<{ id: AiTab; label: string }> {
  return locale === "en"
    ? [{ id: "summary", label: "Summary" }, { id: "terminal", label: "Terminal" }, { id: "chat", label: "AI Chat" }, { id: "reports", label: "Reports" }]
    : [{ id: "summary", label: "Özet" }, { id: "terminal", label: "Terminal" }, { id: "chat", label: "AI Sohbet" }, { id: "reports", label: "Raporlar" }];
}

function getSummaryCards(locale: "tr" | "en") {
  return locale === "en" ? [
    { kicker: "1. Orient", title: "Start with the latest report", body: "See the market frame before opening detailed indicators.", href: "reports", action: "Open reports" },
    { kicker: "2. Inspect", title: "Use the terminal for evidence", body: "Choose an asset and interval, then compare trend, volume, confidence, and risk.", href: "terminal", action: "Open terminal" },
    { kicker: "3. Question", title: "Use chat to test the view", body: "Ask what supports the interpretation and what conditions could invalidate it.", href: "chat", action: "Open AI chat" },
  ] : [
    { kicker: "1. Yönünü bul", title: "Son raporla başla", body: "Ayrıntılı göstergeleri açmadan önce piyasa çerçevesini gör.", href: "reports", action: "Raporları aç" },
    { kicker: "2. Kanıtı incele", title: "Terminali ayrıntı için kullan", body: "Varlık ve vade seç; trend, hacim, güven ve riski birlikte karşılaştır.", href: "terminal", action: "Terminali aç" },
    { kicker: "3. Sorgula", title: "Görüşü sohbetle test et", body: "Yorumu neyin desteklediğini ve hangi koşulun geçersiz kılacağını sor.", href: "chat", action: "AI sohbeti aç" },
  ];
}
