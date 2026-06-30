import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { AdBanner } from "@/components/AdBanner";
import { ManagedContentList } from "@/components/ManagedContentList";
import { MacroReportTicker } from "@/components/ai-market/MacroReportTicker";
import {
  HomeAcademyMotion,
  HomeAiPulseCore,
  HomeFeatureMotion,
  HomeHeroDataFlow,
  HomeInsightSignal,
  HomeMiniLoop,
  HomeMotionCue,
  HomeShaderBackdrop,
  HomeTimelinePulse,
} from "@/components/home/HomeMotion";
import { MiniLineChart } from "@/components/MiniLineChart";
import { LiveMarketOverview } from "@/components/market/LiveMarketOverview";
import { PortfolioBreakdown } from "@/components/PortfolioBreakdown";
import { PortfolioDonut } from "@/components/PortfolioDonut";
import { PremiumCard } from "@/components/PremiumCard";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getAds } from "@/lib/ads";
import { getSessionUser } from "@/lib/auth";
import { getDisplayName } from "@/lib/auth";
import { defaultBadges } from "@/lib/badges";
import { getEconomyHeadlines } from "@/lib/economy-news";
import { getFallbackMarketItems, getLiveMarketItems, getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { getUserRankingPeriods } from "@/lib/leaderboard";
import { getManagedContentItems, type PublicManagedContentItem } from "@/lib/managed-content";
import { getPortfolioBreakdownItems } from "@/lib/portfolio-breakdown";
import { getPortfolioPerformancePeriods, type PortfolioPerformancePeriod } from "@/lib/portfolio-history";
import { calculateCompetitionProfitLossUsd, calculateCompetitionReturnPercent, formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata, stringifyJsonLd } from "@/lib/seo";
import type { DisplayAd } from "@/lib/ads";
import type { MarketItem } from "@/lib/market-data";

type UserRankingPeriod = Awaited<ReturnType<typeof getUserRankingPeriods>>[number];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/", page: "home" });
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function withSoftTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = 2500) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale);
  const user = await getSessionUser();
  const fallbackMarketItems = getFallbackMarketItems();
  const [adsResult, liveItemsResult, announcementsResult, economyHeadlinesResult] = await Promise.allSettled([
    getAds("home_top", locale),
    withSoftTimeout(getLiveMarketItems(), fallbackMarketItems, 2200),
    getManagedContentItems({ type: "ANNOUNCEMENT", locale, limit: 3 }),
    getEconomyHeadlines(4, locale),
  ]);
  const ads = settledValue<DisplayAd[]>(adsResult, []);
  const liveItems = settledValue<MarketItem[]>(liveItemsResult, fallbackMarketItems);
  const economyHeadlines = settledValue<Awaited<ReturnType<typeof getEconomyHeadlines>>>(economyHeadlinesResult, []);
  const snapshotResult = user
    ? await Promise.allSettled([getPortfolioSnapshot(user.id, liveItems)]).then((results) => results[0])
    : { status: "fulfilled" as const, value: null };
  const snapshot = settledValue<Awaited<ReturnType<typeof getPortfolioSnapshot>> | null>(snapshotResult, null);
  const announcements = settledValue<PublicManagedContentItem[]>(announcementsResult, []);
  const [chartPeriodsResult, rankingPeriodsResult, leaderboardHighlightsResult, activeLeagueHighlightsResult] = await Promise.allSettled([
    user && snapshot ? getPortfolioPerformancePeriods(user.id, snapshot.totalValueUsd) : Promise.resolve([]),
    user ? getUserRankingPeriods(user.id) : Promise.resolve([]),
    withSoftTimeout(getLeaderboardHighlights(), []),
    withSoftTimeout(getActiveLeagueHighlights(), []),
  ]);
  const chartPeriods = settledValue<PortfolioPerformancePeriod[]>(chartPeriodsResult, []);
  const rankingPeriods = settledValue<UserRankingPeriod[]>(rankingPeriodsResult, []);
  const leaderboardHighlights = settledValue<LeaderboardHighlight[]>(leaderboardHighlightsResult, []);
  const activeLeagueHighlights = settledValue<LeagueHighlight[]>(activeLeagueHighlightsResult, []);
  const breakdownItems = snapshot ? getPortfolioBreakdownItems(snapshot) : [];
  const strategicCards = getStrategicCards(locale);
  const trustHighlights = getTrustHighlights(locale);
  const spotlightMetrics = getSpotlightMetrics(locale);
  const valueProps = getValueProps(locale);
  const howItWorksSteps = getHowItWorksSteps(locale);
  const storyBlocks = getStoryBlocks(locale);
  const goalCards = getGoalCards(locale);
  const knowledgeBlocks = getKnowledgeBlocks(locale);
  const faqItems = getFaqItems(locale);
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale === "tr" ? "tr-TR" : "en-US",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  const heroStats = getHeroStats(locale);
  const learningLoopCards = getLearningLoopCards(locale);
  const modernTrustItems = [
    {
      icon: "USD",
      title: locale === "tr" ? "Sanal portföy" : "Virtual portfolio",
      body: locale === "tr" ? "Başlangıç bakiyesiyle piyasayı güvenli biçimde dene." : "Practice with a safe starting balance.",
    },
    {
      icon: "0",
      title: locale === "tr" ? "Gerçek para yok" : "No real money",
      body: locale === "tr" ? "Alım satım kararları eğitim amaçlı simülasyonda kalır." : "Trading decisions stay inside an educational simulation.",
    },
    {
      icon: "AI",
      title: locale === "tr" ? "AI destekli öğrenme" : "AI-supported learning",
      body: locale === "tr" ? "Makro rapor ve asistan piyasa dilini sadeleştirir." : "Reports and assistant simplify market context.",
    },
    {
      icon: "!",
      title: locale === "tr" ? "Yatırım tavsiyesi değildir" : "Not investment advice",
      body: locale === "tr" ? "Amaç karar baskısı değil, finansal okuryazarlık kalitesidir." : "The aim is literacy, not investment pressure.",
    },
  ] as const;
  const modernHowSteps = [
    {
      step: "1",
      title: locale === "tr" ? "Kayıt ol" : "Register",
      body: locale === "tr" ? "Akademiye katıl ve sanal bakiyeni hemen al." : "Join the academy and receive your virtual balance.",
    },
    {
      step: "2",
      title: locale === "tr" ? "Analiz et" : "Analyze",
      body: locale === "tr" ? "AI asistanı, makro raporları ve canlı veriyi birlikte oku." : "Read AI context, macro reports, and live data together.",
    },
    {
      step: "3",
      title: locale === "tr" ? "Sanal işlem yap" : "Trade virtually",
      body: locale === "tr" ? "Risk almadan stratejini test et ve gerekçeni yaz." : "Test your strategy without risk and write the reason.",
    },
    {
      step: "4",
      title: locale === "tr" ? "Yarış ve öğren" : "Compete and learn",
      body: locale === "tr" ? "Liglerde ilerle, liderliği izle ve kararlarını geliştir." : "Join leagues, follow rankings, and improve decisions.",
    },
  ] as const;
  const academyContentCards = [
    {
      level: locale === "tr" ? "Başlangıç" : "Beginner",
      title: locale === "tr" ? "Finansal okuryazarlık 101" : "Financial literacy 101",
      body: locale === "tr" ? "Varlık sınıfları, risk, getiri ve portföy mantığını sade bir dille öğren." : "Learn asset classes, risk, return, and portfolio logic clearly.",
      href: `/${locale}/egitim`,
      tone: "blue",
    },
    {
      level: locale === "tr" ? "Orta seviye" : "Intermediate",
      title: locale === "tr" ? "Makro analiz ve rapor okuma" : "Macro analysis and reports",
      body: locale === "tr" ? "Merkez bankaları, dolar, altın, borsa ve kripto ilişkisini bağlam içinde oku." : "Read central banks, dollar, gold, stocks, and crypto in context.",
      href: `/${locale}/ai-piyasa-asistani/raporlar`,
      tone: "gold",
    },
    {
      level: locale === "tr" ? "İleri seviye" : "Advanced",
      title: locale === "tr" ? "AI ile karar pratiği" : "Decision practice with AI",
      body: locale === "tr" ? "Sinyali emir gibi değil, düşünme çerçevesi gibi kullanmayı öğren." : "Use signals as a thinking frame, not as direct orders.",
      href: `/${locale}/ai-piyasa-asistani`,
      tone: "teal",
    },
  ] as const;
  const portfolioReturnPercent = snapshot ? calculateCompetitionReturnPercent(snapshot.totalValueUsd) : null;
  const liveLearningItems = [
    {
      label: locale === "tr" ? "Sanal portföy" : "Virtual portfolio",
      value: snapshot ? formatMoney(snapshot.totalValueUsd) : locale === "tr" ? "Giriş gerekli" : "Sign-in needed",
      body: locale === "tr" ? "Nakit, pozisyon ve kâr/zarar aynı görünümde izlenir." : "Cash, positions, and P/L are tracked in one view.",
      href: `/${locale}/islem-yap`,
      action: locale === "tr" ? "Portföyü aç" : "Open portfolio",
      tone: "portfolio",
      progress: snapshot ? Math.min(Math.max(50 + (portfolioReturnPercent ?? 0) * 3, 12), 92) : 38,
    },
    {
      label: locale === "tr" ? "Aktif ligler" : "Active leagues",
      value: String(activeLeagueHighlights.length),
      body: locale === "tr" ? "Davetsiz katılım ve çoklu lig desteğiyle sosyal öğrenme akışı kurulur." : "Direct joining and multi-league support create social learning momentum.",
      href: `/${locale}/ligler`,
      action: locale === "tr" ? "Ligleri gör" : "View leagues",
      tone: "league",
      progress: Math.min(Math.max(activeLeagueHighlights.length * 18, 24), 88),
    },
    {
      label: locale === "tr" ? "AI rapor ritmi" : "AI report rhythm",
      value: "07/12/18",
      body: locale === "tr" ? "Günlük ritim ve pazartesi geniş rapor ayrı çerçeve verir." : "Daily rhythm and Monday deep reports give separate context.",
      href: `/${locale}/ai-piyasa-asistani/raporlar`,
      action: locale === "tr" ? "Raporlara git" : "Open reports",
      tone: "ai",
      progress: 72,
    },
    {
      label: locale === "tr" ? "Topluluk" : "Community",
      value: locale === "tr" ? "Canlı" : "Live",
      body: locale === "tr" ? "Sohbet, özel oda, anket ve dosya akışı tartışmayı canlı tutar." : "Chat, private rooms, polls, and files keep discussion alive.",
      href: `/${locale}/sohbet`,
      action: locale === "tr" ? "Sohbete gir" : "Open chat",
      tone: "community",
      progress: 64,
    },
  ] as const;
  const featureVisualCards = valueProps.map((item, index) => ({
    ...item,
    tone: ["portfolio", "market", "community"][index] ?? "portfolio",
    metric: index === 0 ? "$1M" : index === 1 ? "30s" : locale === "tr" ? "Lig" : "League",
  }));
  const vividFeatureCards = getVividFeatureCards(locale);
  const communityTags = locale === "tr"
    ? ["#SanalPortföy", "#MakroRapor", "#FinansalOkuryazarlık", "#Ligler", "#AIAsistan"]
    : ["#VirtualPortfolio", "#MacroReports", "#FinancialLiteracy", "#Leagues", "#AIAssistant"];
  const terminalStatusTags = locale === "tr"
    ? ["Risk: kontrollü", "Likidite: izleniyor", "Terminal v1.0"]
    : ["Risk: controlled", "Liquidity: monitored", "Terminal v1.0"];

  return (
    <div className="home-premium home-modern-academy home-stitch-academy grid gap-6">
      <HomeShaderBackdrop />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(faqStructuredData) }}
      />
      <section className="home-premium-hero home-modern-hero hero-visual grid gap-8 p-6 text-white sm:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.95fr)]">
        <div className="home-hero-copy">
          <div className="home-hero-eyebrow-row flex flex-wrap items-center gap-2">
            <p className="home-hero-pill text-xs font-black uppercase tracking-[0.18em]">
              {locale === "tr" ? "Yapay zeka destekli piyasa akademisi" : "AI-supported market academy"}
            </p>
            <p className="home-hero-pill home-hero-pill--live text-xs font-black uppercase tracking-[0.18em]">
              {locale === "tr" ? "Canlı piyasa + AI yorum" : "Live market + AI commentary"}
            </p>
          </div>
          <h1 className="relative mt-5 max-w-5xl text-4xl font-black tracking-normal sm:text-6xl">
            {locale === "tr"
              ? "Gerçek para riske atmadan piyasayı öğren"
              : "Learn the market without risking real money"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            {locale === "tr"
              ? "Enbilir; sanal portföy yarışması, AI piyasa asistanı, makro raporlar ve finansal okuryazarlık içerikleriyle piyasayı daha bilinçli okumayı öğreten modern bir piyasa akademisidir."
              : "Enbilir is a modern market academy combining virtual portfolio competitions, an AI market assistant, macro reports, and financial-literacy content."}
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/kayit`} className="premium-cta home-modern-cta px-5 py-3 text-sm font-black">
              {locale === "tr" ? "30 gün ücretsiz başla" : "Start 30 days free"}
            </Link>
            <Link href={`/${locale}/ai-piyasa-asistani/raporlar`} className="premium-link rounded-md px-5 py-3 text-sm font-black">
              {locale === "tr" ? "Makro raporu aç" : "Open macro report"}
            </Link>
            <Link href={`/${locale}/ai-piyasa-asistani`} className="premium-link rounded-md px-5 py-3 text-sm font-black">
              {locale === "tr" ? "AI asistanı gör" : "View AI assistant"}
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="home-premium-stat home-modern-stat rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">{stat.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{stat.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="home-modern-visual relative min-h-[520px] self-center">
          <div className="home-orbit-ring" aria-hidden="true" />
          <HomeHeroDataFlow />
          <div className="home-terminal-window">
            <div className="home-terminal-topline">
              <span />
              <span />
              <span />
              <strong>{locale === "tr" ? "Canlı öğrenme terminali" : "Live learning terminal"}</strong>
            </div>
            <div className="home-terminal-grid">
              <div className="home-terminal-cell home-terminal-cell--portfolio">
                <p>{locale === "tr" ? "Sanal portföy" : "Virtual portfolio"}</p>
                <strong>{snapshot ? formatMoney(snapshot.totalValueUsd) : "$1,000,000"}</strong>
                <span className={snapshot && snapshot.profitLossUsd < 0 ? "portfolio-loss-text" : "portfolio-profit-text"}>
                  {snapshot ? formatPercent(calculateCompetitionReturnPercent(snapshot.totalValueUsd), true) : "+0.00%"}
                </span>
              </div>
              <div className="home-terminal-cell">
                <p>{locale === "tr" ? "Makro rapor" : "Macro report"}</p>
                <div className="home-terminal-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="home-terminal-cell home-terminal-cell--ai">
                <span className="home-terminal-ai-mark">AI</span>
                <div>
                  <p>{locale === "tr" ? "AI Asistanı" : "AI Assistant"}</p>
                  <strong>
                    {locale === "tr"
                      ? "Tek sinyale değil; veri, rapor ve risk dengesine bak."
                      : "Do not rely on one signal; read data, reports, and risk balance together."}
                  </strong>
                </div>
              </div>
              <div className="home-terminal-status-row">
                {terminalStatusTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="home-floating-card home-floating-card--portfolio">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-bold text-slate-300">{locale === "tr" ? "Sanal Portföyüm" : "My Virtual Portfolio"}</span>
              <span className={snapshot && snapshot.profitLossUsd < 0 ? "portfolio-loss-text font-black" : "portfolio-profit-text font-black"}>
                {snapshot ? formatPercent(calculateCompetitionReturnPercent(snapshot.totalValueUsd), true) : "+0.00%"}
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-white">{snapshot ? formatMoney(snapshot.totalValueUsd) : "$1,000,000"}</p>
            <div className="home-modern-spark mt-5" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="home-floating-card home-floating-card--ai">
            <div className="flex items-center gap-3">
              <span className="home-ai-dot">AI</span>
              <div>
                <p className="text-sm font-black text-white">{locale === "tr" ? "AI Asistan" : "AI Assistant"}</p>
                <p className="text-xs text-slate-300">{locale === "tr" ? "Canlı/cache veriyle yorum" : "Live/cache data context"}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              {locale === "tr"
                ? "Makro veriler ışığında bu hafta risk iştahı, nakit oranı ve sektör rotasyonu birlikte izlenmeli."
                : "This week, risk appetite, cash balance, and sector rotation should be read together."}
            </p>
            <div className="mt-4 flex gap-2" aria-hidden="true">
              <span className="h-1.5 w-16 rounded-full bg-[#98cbff]" />
              <span className="h-1.5 w-10 rounded-full bg-white/15" />
            </div>
          </div>
          <div className="home-floating-card home-floating-card--leader">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{locale === "tr" ? "Liderlik Tablosu" : "Leaderboard"}</p>
            <div className="mt-3 grid gap-2">
              {(leaderboardHighlights.length ? leaderboardHighlights.slice(0, 2) : [
                { displayName: locale === "tr" ? "İlk kullanıcı" : "First user", totalValueUsd: 1000000 },
                { displayName: locale === "tr" ? "Yeni lig" : "New league", totalValueUsd: 1000000 },
              ]).map((item, index) => (
                <div key={`${item.displayName}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-white/90">{index + 1}. {item.displayName}</span>
                  <span className="font-black text-[#62fae3]">{formatMoney(item.totalValueUsd)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="home-floating-card home-floating-card--progress">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f9bd22]">{locale === "tr" ? "Eğitim ilerlemesi" : "Learning progress"}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12">
              <span className="block h-full w-2/3 rounded-full bg-[#f9bd22]" />
            </div>
            <p className="mt-3 text-xs text-slate-300">{locale === "tr" ? "Modül 4: Makro Analiz" : "Module 4: Macro analysis"}</p>
          </div>
        </div>
      </section>

      <section className="home-trust-ribbon home-modern-trust grid gap-3 md:grid-cols-4">
        {modernTrustItems.map((item) => (
          <div key={item.title} className="home-ribbon-item">
            <span className="home-ribbon-icon">{item.icon}</span>
            <div>
              <p className="font-black">{item.title}</p>
              <p>{item.body}</p>
            </div>
          </div>
        ))}
      </section>

      <MacroReportTicker locale={locale} />
      <AdBanner ads={ads} locale={locale} />

      <section className="home-vivid-feature-section">
        <div className="home-vivid-section-head">
          <div className="home-section-kicker home-section-kicker--dark home-section-kicker--center">
            <HomeMotionCue variant="line" />
            <p>{locale === "tr" ? "Finansal analiz için tam donanım" : "A complete toolkit for market literacy"}</p>
          </div>
          <h2>
            {locale === "tr"
              ? "Sanal portföy, AI, makro rapor, lig ve eğitim aynı ekranda çalışır."
              : "Virtual portfolio, AI, macro reports, leagues, and education work together."}
          </h2>
        </div>
        <div className="home-vivid-feature-grid">
          {vividFeatureCards.map((card, index) => (
            <Link key={card.title} href={card.href} className="home-vivid-feature-card">
              <span className={`home-vivid-feature-icon home-vivid-feature-icon--${index + 1}`} aria-hidden="true">
                {card.icon}
              </span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-modern-steps py-3">
        <div className="mb-6 text-center">
          <div className="home-section-kicker home-section-kicker--center">
            <HomeMotionCue variant="line" />
            <p>{locale === "tr" ? "Nasıl çalışır?" : "How it works"}</p>
          </div>
          <h2 className="mt-2 text-3xl font-black text-[#152033]">
            {locale === "tr" ? "Piyasayı 4 adımda deneyimle" : "Experience markets in 4 steps"}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {modernHowSteps.map((step) => (
            <div key={step.step} className="home-modern-step-card">
              <span className="home-modern-step-icon">{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-ai-showcase grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="home-ai-visual" aria-hidden="true">
          <div className="home-ai-screen">
            <div className="home-ai-screen-top">
              <span />
              <span />
              <span />
            </div>
            <div className="home-ai-screen-grid">
              <div className="home-ai-chart">
                <HomeAiPulseCore />
                <span />
                <span />
                <span />
              </div>
              <div className="home-ai-chat-lines">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-5">
          <div className="home-section-kicker home-section-kicker--dark">
            <HomeMotionCue variant="ai" />
            <p>{locale === "tr" ? "AI strateji ortağın" : "Your AI strategy partner"}</p>
          </div>
          <h2 className="text-3xl font-black text-white md:text-4xl">
            {locale === "tr" ? "Veri karmaşasını eğitim diline çeviren asistan" : "An assistant that turns market noise into learning language"}
          </h2>
          <div className="home-ai-insight-box rounded-r-xl border-l-4 border-[#62fae3] bg-[#62fae3]/8 p-5">
            <HomeInsightSignal />
            <p className="text-lg font-black leading-8 text-white">
              {locale === "tr"
                ? "AI Asistanı piyasayı tek başına değil, sistemli düşünmen için var."
                : "The AI Assistant exists to help you think systematically, not to replace judgment."}
            </p>
          </div>
          <p className="text-base leading-8 text-slate-300">
            {locale === "tr"
              ? "Enbilir AI; canlı/cache piyasa verilerini, makro raporları, teknik sinyalleri ve eğitim içeriklerini birlikte okuyarak karar gerekçeni güçlendirmene yardım eder."
              : "Enbilir AI reads live/cache market data, macro reports, technical signals, and education content together to strengthen your decision reasoning."}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {strategicCards.map((card, index) => (
              <div key={card.title} className="home-ai-mini-card home-ai-mini-card--motion">
                <HomeMiniLoop tone={["community", "education", "momentum"][index] ?? "momentum"} />
                <p>{card.eyebrow}</p>
                <h3>{card.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-modern-content-grid grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="home-macro-card p-5 md:p-6">
          <div className="home-section-kicker home-section-kicker--dark home-section-kicker--amber">
            <HomeMotionCue variant="globe" />
            <p>{locale === "tr" ? "Makro rapor takvimi" : "Macro report calendar"}</p>
          </div>
          <h2 className="mt-2 text-3xl font-black text-white">
            {locale === "tr" ? "Piyasa ritmini raporlarla yakala" : "Catch the market rhythm through reports"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {locale === "tr"
              ? "Günlük raporlar hızlı çerçeve, pazartesi haftalık rapor ise daha geniş perspektif verir."
              : "Daily reports give quick context; Monday weekly reports give a broader perspective."}
          </p>
          <div className="mt-5 grid gap-3">
            {[
              { time: "07:00", title: locale === "tr" ? "Sabah piyasa çerçevesi" : "Morning market frame" },
              { time: "12:00", title: locale === "tr" ? "Gün ortası güncellemesi" : "Midday update" },
              { time: locale === "tr" ? "Pazartesi" : "Monday", title: locale === "tr" ? "Haftalık geniş makro rapor" : "Weekly broad macro report" },
            ].map((item) => (
              <Link key={`${item.time}-${item.title}`} href={`/${locale}/ai-piyasa-asistani/raporlar`} className="home-macro-row">
                <span>{item.time}</span>
                <HomeTimelinePulse />
                <strong>{item.title}</strong>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {academyContentCards.map((card) => (
            <Link key={card.title} href={card.href} className={`home-academy-card home-academy-card--${card.tone}`}>
              <HomeAcademyMotion tone={card.tone} />
              <p className="home-academy-level">{card.level}</p>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-learning-dashboard premium-card p-5 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="home-section-kicker">
              <HomeMotionCue variant="radar" />
              <p>{locale === "tr" ? "Canlı öğrenme paneli" : "Live learning panel"}</p>
            </div>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">
              {locale === "tr" ? "Portföy, lig, rapor ve sohbet aynı eğitim akışında birleşir." : "Portfolio, leagues, reports, and chat work as one learning flow."}
            </h2>
          </div>
          <Link href={`/${locale}/siteyi-anlamak`} className="premium-link rounded-md px-4 py-2 text-sm font-black">
            {locale === "tr" ? "Siteyi anlamaya başla" : "Start with the site guide"}
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {liveLearningItems.map((item) => (
            <Link key={item.label} href={item.href} className={`home-live-panel-card home-live-panel-card--${item.tone}`}>
              <div className="home-live-panel-top">
                <span className="home-live-panel-icon" aria-hidden="true" />
                <p>{item.label}</p>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="home-live-panel-value">{item.value}</p>
                <span className="home-live-panel-pulse" aria-hidden="true" />
              </div>
              <div className="home-live-panel-track" aria-hidden="true">
                <span style={{ width: `${item.progress}%` }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#0f766e]">{item.action}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-learning-loop premium-card p-5 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
              {locale === "tr" ? "Profesyonel öğrenme akışı" : "Professional learning loop"}
            </p>
            <h2 className="mt-2 max-w-4xl text-2xl font-black text-[#152033] md:text-3xl">
              {locale === "tr" ? "Tek sayfa değil, tekrar eden bir finansal okuryazarlık sistemi." : "Not a single page, but a repeatable market-literacy system."}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
              {locale === "tr"
                ? "Enbilir'in profesyonel kullanım mantığı beş adımdır: kavramı oku, karar gerekçeni yaz, sanal portföyde dene, toplulukla karşılaştır ve AI ile gözden geçir."
                : "The professional way to use Enbilir has five steps: read the concept, write your decision reason, test virtually, compare with the community, and review with AI."}
            </p>
          </div>
          <Link href={`/${locale}/icerik-merkezi`} className="premium-action inline-flex px-5 py-3 text-sm font-black">
            {locale === "tr" ? "İçerik merkezini aç" : "Open content hub"}
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {learningLoopCards.map((card) => (
            <Link key={card.step} href={card.href} className="home-learning-step rounded-2xl border border-[#d1bfa7]/35 bg-white/72 p-4 hover:border-[#0f766e]/45">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#101827] text-xs font-black text-[#d1bfa7]">
                {card.step}
              </span>
              <h3 className="mt-3 text-base font-black text-[#152033]">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-feature-grid grid gap-4 md:grid-cols-3">
        {featureVisualCards.map((item) => (
          <Link key={item.title} href={item.tone === "portfolio" ? `/${locale}/islem-yap` : item.tone === "market" ? `/${locale}/ai-piyasa-asistani` : `/${locale}/ligler`} className={`home-feature-card home-feature-card--${item.tone}`}>
            <HomeFeatureMotion tone={item.tone} />
            <div className="home-feature-body">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{item.eyebrow}</p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <h2 className="text-2xl font-black text-[#152033]">{item.title}</h2>
                <span className="home-feature-metric">{item.metric}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          </Link>
        ))}
      </section>

      <PremiumCard interactive className="home-flow-dashboard p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="home-section-kicker">
              <HomeMotionCue variant="line" />
              <p>{locale === "tr" ? "Nasıl çalışır?" : "How it works"}</p>
            </div>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">
              {locale === "tr" ? "İlk 5 saniyede akışı anlayıp hemen başlayabil." : "Understand the full flow in 5 seconds and start immediately."}
            </h2>
          </div>
          <Link href={`/${locale}/kayit`} className="premium-cta inline-flex px-5 py-3 text-sm font-black">
            {locale === "tr" ? "Ücretsiz kayıt ol" : "Register for free"}
          </Link>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-5">
          {howItWorksSteps.map((step) => (
            <div key={step.title} className="home-flow-step">
              <span className="home-flow-index">{step.step}</span>
              <div className="home-flow-spark" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h3 className="mt-3 text-lg font-black text-[#152033]">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </PremiumCard>

      <ManagedContentList
        items={announcements}
        featuredLabel={locale === "en" ? "Featured" : "Öne çıkan"}
        variant="compact"
      />

      <LiveMarketOverview
        locale={locale}
        initialItems={liveItems}
        title={copy.home.topRisers}
        panelTitle={locale === "tr" ? "Güncel Haberler" : "Latest Headlines"}
        headlines={economyHeadlines}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <PremiumCard interactive className="p-5">
          <div className="home-section-kicker">
            <HomeMotionCue variant="signal" />
            <p>{locale === "tr" ? "Neden çekici?" : "Why it is compelling"}</p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "Yarışma, eğitim ve aidiyet duygusunu tek akışta birleştirir." : "It combines competition, education, and community belonging in one flow."}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {spotlightMetrics.map((metric, index) => (
              <MetricVisualCard key={metric.label} metric={metric} index={index} />
            ))}
          </div>
        </PremiumCard>

        <PremiumCard interactive className="p-5">
          <div className="home-section-kicker">
            <HomeMotionCue variant="shield" />
            <p>{locale === "tr" ? "Güven katmanı" : "Trust layer"}</p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "Platform karar baskısını değil, öğrenme kalitesini artırır." : "The platform improves learning quality, not decision pressure."}
          </h2>
          <div className="mt-5 grid gap-3">
            {trustHighlights.map((item) => (
              <div key={item.title} className="home-trust-stack-item rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-sm font-black text-[#152033]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </PremiumCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <PremiumCard interactive className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="home-section-kicker">
                <HomeMotionCue variant="signal" />
                <p>{locale === "tr" ? "Rekabet ve oyunlaştırma" : "Competition and gamification"}</p>
              </div>
              <h2 className="mt-2 text-2xl font-black text-[#152033]">
                {locale === "tr" ? "Liderlik, lig ve rozet görünürlüğü ile geri dönüş motivasyonu kur." : "Create return motivation with visible leaderboards, leagues, and badges."}
              </h2>
            </div>
            <Link href={`/${locale}/liderlik-tablosu`} className="premium-link inline-flex rounded-md px-4 py-2 text-sm font-black">
              {locale === "tr" ? "Liderliği aç" : "Open leaderboard"}
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <ShowcaseListCard
              title={locale === "tr" ? "Haftanın liderleri" : "Leaders of the week"}
              caption={locale === "tr" ? "Güncel portföy görünümüne göre" : "Based on current portfolio view"}
              items={leaderboardHighlights.slice(0, 3).map((item) => ({
                title: item.displayName,
                value: formatMoney(item.totalValueUsd),
                meta: `${item.profitLossPercent >= 0 ? "+" : ""}${item.profitLossPercent.toFixed(2)}%`,
              }))}
              emptyLabel={locale === "tr" ? "Henüz lider verisi yok." : "No leader data yet."}
            />
            <ShowcaseListCard
              title={locale === "tr" ? "Ayın en iyi portföyleri" : "Top portfolios of the month"}
              caption={locale === "tr" ? "Sanal bakiye üstüne performans" : "Performance above virtual balance"}
              items={leaderboardHighlights.slice(0, 3).map((item) => ({
                title: item.displayName,
                value: `${item.profitLossUsd >= 0 ? "+" : ""}${formatMoney(item.profitLossUsd)}`,
                meta: formatMoney(item.totalValueUsd),
              }))}
              emptyLabel={locale === "tr" ? "Henüz portföy verisi yok." : "No portfolio data yet."}
            />
            <ShowcaseListCard
              title={locale === "tr" ? "En aktif ligler" : "Most active leagues"}
              caption={locale === "tr" ? "Üye sayısına göre" : "By member count"}
              items={activeLeagueHighlights.slice(0, 3).map((item) => ({
                title: item.name,
                value: locale === "tr" ? `${item.memberCount} üye` : `${item.memberCount} members`,
                meta: formatLeagueTypeLabel(item.typeLabel, locale),
              }))}
              emptyLabel={locale === "tr" ? "Henüz aktif lig yok." : "No active leagues yet."}
            />
          </div>
        </PremiumCard>

        <PremiumCard interactive className="p-5">
          <div className="home-section-kicker">
            <HomeMotionCue variant="badge" />
            <p>{locale === "tr" ? "Hedefler ve rozetler" : "Goals and badges"}</p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "Kullanıcıya net hedef ver, ilerlemeyi görünür yap." : "Give the user clear goals and make progress visible."}
          </h2>
          <div className="mt-5 grid gap-3">
            {goalCards.map((item, index) => (
              <div key={item.title} className="home-goal-card rounded-2xl border border-slate-200 bg-white/85 p-4">
                <div className="flex items-start gap-3">
                  <span className="home-goal-icon text-2xl text-[#f5a623]">{item.icon}</span>
                  <div>
                    <p className="text-sm font-black text-[#152033]">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                    <div className="home-goal-track" aria-hidden="true">
                      <span style={{ width: `${58 + index * 9}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {storyBlocks.map((item) => (
          <PremiumCard key={item.title} interactive className="home-story-card p-5">
            <div className="home-story-visual" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{item.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </PremiumCard>
        ))}
      </section>

      <section className="home-vivid-community-section">
        <div className="home-vivid-community-copy">
          <div className="home-section-kicker home-section-kicker--dark">
            <HomeMotionCue variant="badge" />
            <p>{locale === "tr" ? "Topluluk ve lig deneyimi" : "Community and league experience"}</p>
          </div>
          <h2>
            {locale === "tr"
              ? "Tek başına öğrenme değil, birlikte gelişen piyasa okuryazarlığı."
              : "Not isolated learning, but market literacy that improves together."}
          </h2>
          <p>
            {locale === "tr"
              ? "Sohbet odaları, ligler, arkadaş sıralamaları ve haftalık liderler; kullanıcıyı platforma geri getiren sosyal öğrenme ritmini kurar."
              : "Chat rooms, leagues, friend rankings, and weekly leaders create the social learning rhythm that brings users back."}
          </p>
          <div className="home-vivid-community-tags">
            {communityTags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
        <div className="home-vivid-community-panel">
          <div className="home-vivid-community-wave" aria-hidden="true" />
          <p>{locale === "tr" ? "Aktif lig görünümü" : "Active league view"}</p>
          <div className="home-vivid-community-list">
            {(activeLeagueHighlights.length ? activeLeagueHighlights.slice(0, 4) : [
              { name: "ROTARYEN", typeLabel: "ROTARY", memberCount: 0 },
              { name: "ROTARACT", typeLabel: "ROTARACT", memberCount: 0 },
              { name: locale === "tr" ? "SERBEST" : "PUBLIC", typeLabel: "GENERAL", memberCount: 0 },
            ]).map((league) => (
              <div key={league.name}>
                <span>{league.name}</span>
                <strong>{locale === "tr" ? `${league.memberCount} üye` : `${league.memberCount} members`}</strong>
              </div>
            ))}
          </div>
          <Link href={`/${locale}/ligler`} className="home-vivid-community-link">
            {locale === "tr" ? "Liglere git" : "Open leagues"}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PremiumCard interactive className="p-5">
          <div className="home-section-kicker">
            <HomeMotionCue variant="line" />
            <p>{locale === "tr" ? "Okuma Alanı" : "Reading area"}</p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "Platformu kullanmadan önce bilinmesi gereken temel çerçeve" : "The essential framework to know before using the platform"}
          </h2>
          <div className="mt-5 grid gap-4">
            {knowledgeBlocks.map((item) => (
              <article key={item.title} className="home-reading-card rounded-2xl bg-[#f8fafc] p-5 ring-1 ring-slate-200/70">
                <h3 className="text-lg font-black text-[#152033]">{item.title}</h3>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600">
                  {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </article>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard interactive className="p-5">
          <div className="home-section-kicker">
            <HomeMotionCue variant="ai" />
            <p>{locale === "tr" ? "Sık Sorulanlar" : "Frequently asked"}</p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "İlk ziyaretçinin en hızlı sorduğu sorular" : "The questions a first-time visitor asks most quickly"}
          </h2>
          <div className="mt-5 grid gap-3">
            {faqItems.map((item) => (
              <details key={item.question} className="home-faq-card rounded-2xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-black text-[#152033]">{item.question}</summary>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </PremiumCard>
      </section>

      <section className="home-vivid-final-cta">
        <div className="home-vivid-final-glow" aria-hidden="true" />
        <h2>
          {locale === "tr"
            ? "Geleceğin finansal dünyasına bugünden hazırlan."
            : "Prepare for the financial world of tomorrow today."}
        </h2>
        <p>
          {locale === "tr"
            ? "Ücretsiz kaydol, sanal bakiyeni al, AI asistanla düşünme biçimini geliştir ve liglerde kendini dene."
            : "Register for free, receive your virtual balance, improve your thinking with the AI assistant, and test yourself in leagues."}
        </p>
        <div>
          <Link href={`/${locale}/kayit`} className="home-vivid-final-primary">
            {locale === "tr" ? "Ücretsiz kayıt ol" : "Register for free"}
          </Link>
          <Link href={`/${locale}/ai-piyasa-asistani/raporlar`} className="home-vivid-final-secondary">
            {locale === "tr" ? "Makro raporları incele" : "Explore macro reports"}
          </Link>
        </div>
      </section>

      <section className="home-data-deck grid gap-5 xl:grid-cols-[280px_1fr_1fr_1fr]">
        <div className="grid gap-4">
          <PremiumCard interactive className="home-portfolio-data-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="home-data-eyebrow">{locale === "tr" ? "Sanal varlık görünümü" : "Virtual asset view"}</p>
                <h2 className="mt-1 text-lg font-black text-[#152033]">{copy.home.portfolio}</h2>
              </div>
              <HomeMotionCue variant="radar" />
            </div>
            <p className="home-data-value mt-3 text-2xl font-black text-[#0f766e]">{snapshot ? formatMoney(snapshot.totalValueUsd) : "-"}</p>
            <p className="mt-1 text-sm text-slate-500">{copy.home.portfolioBody}</p>
            {snapshot ? (
              <>
                <div className="mt-4">
                  <PortfolioDonut
                    total={snapshot.totalValueUsd}
                    size="sm"
                    animated
                    otherLabel={locale === "en" ? "Other" : "Diğer"}
                    labels={{
                      allocation: locale === "en" ? "Weight" : "Ağırlık",
                      profitLoss: locale === "en" ? "P/L" : "K/Z",
                    }}
                    items={[
                      { label: copy.trade.cash, detail: snapshot.cashCurrency, value: snapshot.cashValueUsd, profitLossPercent: null },
                      ...snapshot.positions.map((position) => {
                        const costUsd = position.competitionCostUsd;

                        return {
                          label: position.symbol,
                          detail: position.name,
                          value: position.valueUsd,
                          profitLossPercent: costUsd > 0 ? (position.profitLossUsd / costUsd) * 100 : null,
                        };
                      }),
                    ]}
                  />
                </div>
                <div className="home-calculation-card mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0f766e]">
                    {locale === "en" ? "Calculation check" : "Hesap kontrolü"}
                  </p>
                  <div className="mt-2 grid gap-1 text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>{locale === "en" ? "P/L base" : "K/Z bazı"}</span>
                      <span className="text-[#152033]">{formatMoney(snapshot.initialCapitalUsd)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-emerald-100 pt-1">
                      <span>{locale === "en" ? "Cash" : "Nakit"}</span>
                      <span className="text-[#152033]">{formatMoney(snapshot.cashValueUsd)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{locale === "en" ? "Positions" : "Pozisyonlar"}</span>
                      <span className="text-[#152033]">{formatMoney(snapshot.positionsValueUsd)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-emerald-100 pt-1 font-black text-[#0f766e]">
                      <span>{locale === "en" ? "Total" : "Toplam"}</span>
                      <span>{formatMoney(snapshot.totalValueUsd)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <PortfolioBreakdown items={breakdownItems} compact />
                </div>
                <PerformanceBadges periods={chartPeriods} copy={copy.home} />
              </>
            ) : (
              <p className="mt-4 rounded-md bg-[#f8fafc] p-3 text-xs leading-5 text-slate-500">
                {user ? copy.home.noEnoughData : copy.home.profitLogin}
              </p>
            )}
          </PremiumCard>
        </div>

        <PremiumCard interactive className="home-change-data-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="home-data-eyebrow">{locale === "tr" ? "Trend önizleme" : "Trend preview"}</p>
              <h2 className="mt-1 text-lg font-black text-[#152033]">{copy.home.portfolioChange}</h2>
            </div>
            <HomeMotionCue variant="signal" />
          </div>
          <div className="mt-4 grid gap-4">
            {chartPeriods.length === 0 ? (
              <p className="text-sm text-slate-500">{user ? copy.home.noEnoughData : copy.home.chartLogin}</p>
            ) : chartPeriods.map((period) => {
              const hasTrendData = period.change !== null && period.points.length >= 2;

              return (
                <div key={period.label} className="home-period-card rounded-md bg-[#f8fafc] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-black text-[#152033]">{copy.home.periodLabels[period.key]}</p>
                    <div className="text-right">
                      <p className={period.change === null ? "font-black portfolio-neutral-text" : period.change >= 0 ? "font-black portfolio-profit-text" : "font-black portfolio-loss-text"}>
                        {hasTrendData && period.change !== null ? formatPercent(period.change) : "-"}
                      </p>
                      {!hasTrendData ? <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{copy.home.historyPending}</p> : null}
                    </div>
                  </div>
                  {hasTrendData ? (
                    <MiniLineChart points={period.points} />
                  ) : (
                    <div className="home-period-empty" role="status">
                      <span aria-hidden="true" />
                      <p>{copy.home.historyPendingBody}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </PremiumCard>

        <PremiumCard interactive className="home-ranking-data-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="home-data-eyebrow">{locale === "tr" ? "Topluluk konumu" : "Community position"}</p>
              <h2 className="mt-1 text-lg font-black text-[#152033]">{copy.home.rankings}</h2>
            </div>
            <HomeMotionCue variant="badge" />
          </div>
          <div className="mt-4 grid gap-3">
            {rankingPeriods.length === 0 ? (
              <p className="text-sm text-slate-500">{user ? copy.home.noEnoughData : copy.home.rankingLogin}</p>
            ) : rankingPeriods.map((period) => (
              <div key={period.label} className="home-ranking-period-card rounded-md bg-[#f8fafc] p-4">
                <p className="font-black text-[#152033]">{translateRankingPeriod(period.label, copy.home.periodLabels)}</p>
                <p className="mt-1 text-sm text-slate-600">{copy.home.overall}: {period.overall}/{period.totalUsers}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {copy.home.friends}: {period.hasFriends && period.friends ? `${period.friends}/${period.totalFriendsScope}` : copy.home.noFriends}
                </p>
              </div>
            ))}
          </div>
        </PremiumCard>

        <div className="grid gap-5">
          <NewsList title={copy.home.marketNewsTitle} items={copy.home.marketNews} />
          <NewsList title={copy.home.rotaryNewsTitle} items={copy.home.rotaryNews} />
        </div>
      </section>
    </div>
  );
}

type LeaderboardHighlight = {
  displayName: string;
  totalValueUsd: number;
  profitLossUsd: number;
  profitLossPercent: number;
};

type LeagueHighlight = {
  name: string;
  typeLabel: string;
  memberCount: number;
};

async function getLeaderboardHighlights(): Promise<LeaderboardHighlight[]> {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
    take: 24,
  });

  if (users.length === 0) {
    return [];
  }

  const heldSymbols = await prisma.portfolioPosition.findMany({
    select: { symbol: true },
    distinct: ["symbol"],
  });
  const liveMarketItems = await getLiveMarketItemsForSymbols(heldSymbols.map((position) => position.symbol));
  const rows = await Promise.all(
    users.map(async (candidate) => {
      const snapshot = await getPortfolioSnapshot(candidate.id, liveMarketItems);

      return {
        displayName: getDisplayName(candidate),
        totalValueUsd: snapshot.totalValueUsd,
        profitLossUsd: calculateCompetitionProfitLossUsd(snapshot.totalValueUsd),
        profitLossPercent: calculateCompetitionReturnPercent(snapshot.totalValueUsd),
      };
    }),
  );

  return rows.sort((left, right) => right.totalValueUsd - left.totalValueUsd).slice(0, 5);
}

async function getActiveLeagueHighlights(): Promise<LeagueHighlight[]> {
  const leagues = await prisma.league.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { memberships: true },
      },
    },
    take: 24,
  });

  return leagues
    .sort((left, right) => right._count.memberships - left._count.memberships)
    .slice(0, 5)
    .map((league) => ({
      name: league.name,
      typeLabel: league.type,
      memberCount: league._count.memberships,
    }));
}

function ShowcaseListCard({
  title,
  caption,
  items,
  emptyLabel,
}: {
  title: string;
  caption: string;
  items: { title: string; value: string; meta: string }[];
  emptyLabel: string;
}) {
  const getValueToneClass = (value: string) => {
    const trimmedValue = value.trim();

    if (trimmedValue.startsWith("-")) {
      return "portfolio-loss-text";
    }

    if (trimmedValue.startsWith("+")) {
      return "portfolio-profit-text";
    }

    return "text-[#0f766e]";
  };

  return (
    <div className="home-showcase-list-card min-w-0 rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#152033]">{title}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{caption}</p>
        </div>
        <span className="home-showcase-signal" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="home-showcase-row flex min-w-0 items-center justify-between gap-3 rounded-xl bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-black text-[#152033]">{item.title}</p>
                <p className="mt-1 break-words text-xs text-slate-500">{item.meta}</p>
              </div>
              <p className={`min-w-0 max-w-[45%] break-words text-right text-sm font-black ${getValueToneClass(item.value)}`}>{item.value}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MetricVisualCard({
  metric,
  index,
}: {
  metric: { value: string; label: string; body: string };
  index: number;
}) {
  const progress = [78, 66, 52][index] ?? 60;

  return (
    <div className={`home-metric-visual-card home-metric-visual-card--${index + 1}`}>
      <div className="home-metric-ring" style={{ "--metric-progress": `${progress}%` } as CSSProperties}>
        <span>{metric.value}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#0f766e]">{metric.label}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{metric.body}</p>
        <div className="home-metric-spark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function formatLeagueTypeLabel(type: string, locale: string) {
  const labels =
    locale === "en"
      ? {
          ROTARY: "Rotary",
          ROTARACT: "Rotaract",
          INTERACT: "Interact",
          PRIVATE: "Private League",
          GENERAL: "Public League",
        }
      : {
          ROTARY: "Rotary",
          ROTARACT: "Rotaract",
          INTERACT: "Interact",
          PRIVATE: "Özel Lig",
          GENERAL: "Genel Lig",
        };

  return labels[type as keyof typeof labels] ?? type;
}

function getHeroStats(locale: string) {
  if (locale === "en") {
    return [
      { value: "0", label: "Real-money risk", body: "Practice decisions in a simulation-first environment." },
      { value: "3", label: "Daily macro reports", body: "Follow the morning, noon, and evening market rhythm." },
      { value: "24/7", label: "Learning surface", body: "Read market data, rankings, and AI context whenever you return." },
    ] as const;
  }

  return [
    { value: "0", label: "Gerçek para riski", body: "Karar pratiğini simülasyon öncelikli güvenli alanda yap." },
    { value: "3", label: "Günlük makro rapor", body: "Sabah, öğlen ve akşam piyasa ritmini takip et." },
    { value: "7/24", label: "Öğrenme zemini", body: "Piyasa verisi, sıralama ve AI bağlamına her dönüşünde ulaş." },
  ] as const;
}

function getVividFeatureCards(locale: string) {
  if (locale === "en") {
    return [
      {
        icon: "01",
        title: "Virtual portfolio competition",
        body: "Practice on real market data with zero real-money risk and make your learning process visible.",
        href: `/${locale}/islem-yap`,
      },
      {
        icon: "AI",
        title: "AI Market Assistant",
        body: "Turn complex market data into a calmer educational reading frame before acting.",
        href: `/${locale}/ai-piyasa-asistani`,
      },
      {
        icon: "07",
        title: "Daily macro reports",
        body: "Follow morning, midday, and evening market context without drowning in noise.",
        href: `/${locale}/ai-piyasa-asistani/raporlar`,
      },
      {
        icon: "LG",
        title: "Leagues and leadership",
        body: "Compete with your community and compare portfolio discipline through transparent rankings.",
        href: `/${locale}/ligler`,
      },
      {
        icon: "ED",
        title: "Financial literacy",
        body: "Build the habit of reading risk, balance sheets, macro data, crypto, and asset allocation.",
        href: `/${locale}/egitim`,
      },
      {
        icon: "CM",
        title: "Community learning",
        body: "Use chat, rooms, polls, and shared discussion to keep market learning social.",
        href: `/${locale}/sohbet`,
      },
    ] as const;
  }

  return [
    {
      icon: "01",
      title: "Sanal Portföy Yarışması",
      body: "Gerçek piyasa verileriyle sıfır gerçek para riski alarak işlem pratiği yap, öğrenme sürecini görünür kıl.",
      href: `/${locale}/islem-yap`,
    },
    {
      icon: "AI",
      title: "AI Piyasa Asistanı",
      body: "Karmaşık piyasa verilerini, karar almadan önce daha sakin bir eğitim çerçevesine dönüştür.",
      href: `/${locale}/ai-piyasa-asistani`,
    },
    {
      icon: "07",
      title: "Günlük Makro Raporlar",
      body: "Sabah, gün ortası ve akşam piyasa bağlamını gürültüye boğulmadan takip et.",
      href: `/${locale}/ai-piyasa-asistani/raporlar`,
    },
    {
      icon: "LG",
      title: "Ligler ve Liderlik",
      body: "Topluluğunla yarış, portföy disiplinini şeffaf sıralamalar üzerinden karşılaştır.",
      href: `/${locale}/ligler`,
    },
    {
      icon: "ED",
      title: "Finansal Okuryazarlık",
      body: "Risk, bilanço, makro veri, kripto ve portföy dağılımı okuma alışkanlığı kazan.",
      href: `/${locale}/egitim`,
    },
    {
      icon: "CM",
      title: "Topluluk Öğrenmesi",
      body: "Sohbet, özel oda, anket ve ortak tartışmalarla piyasa öğrenmesini sosyal hale getir.",
      href: `/${locale}/sohbet`,
    },
  ] as const;
}

function getValueProps(locale: string) {
  if (locale === "en") {
    return [
      { eyebrow: "Benefit 1", title: "Virtual money", body: "Start with a safe virtual balance and learn by doing without real-money pressure." },
      { eyebrow: "Benefit 2", title: "Live market data", body: "Track real market movement every 30 seconds and turn market rhythm into learning." },
      { eyebrow: "Benefit 3", title: "Friends and league competition", body: "Compete with your Rotary circle, compare portfolios, and keep the social loop alive." },
    ] as const;
  }

  return [
    { eyebrow: "Fayda 1", title: "Sanal para", body: "Güvenli sanal bakiye ile gerçek para baskısı olmadan uygulayarak öğren." },
    { eyebrow: "Fayda 2", title: "Canlı piyasa verisi", body: "30 saniyede bir güncellenen piyasa akışıyla ritmi izle, öğrenmeyi güncel tut." },
    { eyebrow: "Fayda 3", title: "Arkadaş ve lig rekabeti", body: "Rotary çevrenle yarış, portföyleri karşılaştır ve sosyal motivasyonu diri tut." },
  ] as const;
}

function getLearningLoopCards(locale: string) {
  if (locale === "en") {
    return [
      { step: "01", title: "Read", body: "Start from the content hub and build the language of the concept.", href: "/en/icerik-merkezi" },
      { step: "02", title: "Write", body: "Record why a virtual decision makes sense before you test it.", href: "/en/islem-yap" },
      { step: "03", title: "Test", body: "Apply the idea in the virtual portfolio without real-money pressure.", href: "/en/islem-yap" },
      { step: "04", title: "Compare", body: "Use leagues and leaderboards to see behavior in context.", href: "/en/liderlik-tablosu" },
      { step: "05", title: "Review", body: "Ask the AI scenario mode what changed and what risk means.", href: "/en/ai-piyasa-asistani" },
    ] as const;
  }

  return [
    { step: "01", title: "Oku", body: "İçerik merkezinden başla ve kavram dilini kur.", href: "/tr/icerik-merkezi" },
    { step: "02", title: "Yaz", body: "Sanal kararı denemeden önce nedenini kaydet.", href: "/tr/islem-yap" },
    { step: "03", title: "Dene", body: "Fikri gerçek para baskısı olmadan sanal portföyde uygula.", href: "/tr/islem-yap" },
    { step: "04", title: "Karşılaştır", body: "Lig ve liderlik ekranlarıyla davranışı bağlama oturt.", href: "/tr/liderlik-tablosu" },
    { step: "05", title: "Gözden geçir", body: "AI senaryo moduna ne değiştiğini ve riskin ne anlattığını sor.", href: "/tr/ai-piyasa-asistani" },
  ] as const;
}

function getHowItWorksSteps(locale: string) {
  if (locale === "en") {
    return [
      { step: "1", title: "Register for free", body: "Create your account in minutes and enter the platform with one profile." },
      { step: "2", title: "Receive your virtual balance", body: "Start with a simulated balance and shape your portfolio without financial risk." },
      { step: "3", title: "Place virtual trades", body: "Buy, sell, and observe how your decisions affect your ranking and performance." },
      { step: "4", title: "Compete inside a league", body: "Join your club, invite your friends, and compare progress inside your own community." },
      { step: "5", title: "Analyze with the AI assistant", body: "Review radar, indicators, and summaries to turn movement into market literacy." },
    ] as const;
  }

  return [
    { step: "1", title: "Ücretsiz kayıt ol", body: "Dakikalar içinde hesabını oluştur ve platforma tek profil ile giriş yap." },
    { step: "2", title: "Sanal bakiyeni al", body: "Simüle edilmiş bakiye ile finansal risk almadan portföyünü şekillendirmeye başla." },
    { step: "3", title: "İşlem yap", body: "Al, sat ve kararlarının sıralama ile performansına nasıl yansıdığını gör." },
    { step: "4", title: "Ligde yarış", body: "Kulübüne katıl, lig bağlantını paylaş ve kendi topluluğunda ilerlemeyi karşılaştır." },
    { step: "5", title: "AI asistanla analiz et", body: "Radar, göstergeler ve özetler ile piyasa hareketini okuryazarlığa dönüştür." },
  ] as const;
}

function getStoryBlocks(locale: string) {
  if (locale === "en") {
    return [
      { eyebrow: "Today", title: "What can you learn today?", body: "Spot trend shifts, compare risk and confidence, and understand why a signal looks strong or weak." },
      { eyebrow: "League", title: "Which league can you compete in today?", body: "Rotary, Rotaract, Interact, or focused community leagues can all become active learning arenas." },
      { eyebrow: "AI", title: "What does the assistant see today?", body: "The assistant surfaces movement, explains the context, and helps your community discuss decisions more clearly." },
    ] as const;
  }

  return [
    { eyebrow: "Bugün", title: "Bugün ne öğrenebilirsin?", body: "Trend değişimini fark et, risk ve güven ilişkisini kıyasla, bir sinyalin neden güçlü ya da zayıf göründüğünü anla." },
    { eyebrow: "Lig", title: "Bugün hangi ligde yarışabilirsin?", body: "Rotary, Rotaract, Interact veya özel topluluk ligleri öğrenmenin sosyal ve canlı alanına dönüşebilir." },
    { eyebrow: "AI", title: "AI asistan bugün ne görüyor?", body: "Asistan hareketi yüzeye çıkarır, bağlamı açıklar ve topluluğun kararları daha net tartışmasına yardım eder." },
  ] as const;
}

function getGoalCards(locale: string) {
  const badgeMap = new Map(defaultBadges.map((badge) => [badge.code, badge.icon]));

  if (locale === "en") {
    return [
      { icon: badgeMap.get("FIRST_TRADE") ?? "↗", title: "Complete your first trade", body: "The first action breaks hesitation and turns the platform into a hands-on learning tool." },
      { icon: badgeMap.get("FIRST_LEAGUE") ?? "♛", title: "Join your first league", body: "Social commitment keeps users coming back and makes comparison meaningful." },
      { icon: badgeMap.get("PATIENT_INVESTOR") ?? "◷", title: "Protect your portfolio for 7 days", body: "Encourage discipline instead of constant reaction by tracking patience as a visible goal." },
      { icon: badgeMap.get("RISK_MASTER") ?? "◇", title: "Keep risk under 30%", body: "Turn risk awareness into a measurable challenge instead of a passive warning." },
    ] as const;
  }

  return [
    { icon: badgeMap.get("FIRST_TRADE") ?? "↗", title: "İlk işlemini yap", body: "İlk aksiyon tereddüdü kırar ve platformu izlenen değil kullanılan bir öğrenme aracına dönüştürür." },
    { icon: badgeMap.get("FIRST_LEAGUE") ?? "♛", title: "İlk ligine katıl", body: "Sosyal bağlılık geri dönüşü artırır ve kıyaslamayı anlamlı hale getirir." },
    { icon: badgeMap.get("PATIENT_INVESTOR") ?? "◷", title: "Portföyünü 7 gün koru", body: "Sürekli reaksiyon yerine disiplini görünür bir hedefe dönüştürür." },
    { icon: badgeMap.get("RISK_MASTER") ?? "◇", title: "Riskini %30 altında tut", body: "Risk farkındalığını pasif uyarı olmaktan çıkarıp ölçülebilir bir meydan okumaya dönüştürür." },
  ] as const;
}

function getKnowledgeBlocks(locale: string) {
  if (locale === "en") {
    return [
      {
        title: "What exactly is Enbilir?",
        paragraphs: [
          "Enbilir is an education-led virtual portfolio platform. Users do not connect a brokerage account, do not send real orders, and do not expose real capital to the market. Instead, they learn how markets move by building a virtual portfolio, comparing decisions, and discussing outcomes inside a community.",
          "The platform is especially strong for Rotary, Rotaract, and Interact communities because it combines financial literacy with social motivation. A member does not just read theory; they can join a league, track performance, and interpret market signals together with others.",
        ],
      },
      {
        title: "Why is simulation-based learning valuable?",
        paragraphs: [
          "Most beginners struggle not because information is unavailable, but because market information feels fast, technical, and emotionally intense. A simulated environment reduces fear and gives people room to practice. That space is where better habits begin.",
          "When a user can make a portfolio decision without real-money pressure, they become more open to asking better questions: Why did I choose this asset? What risk did I ignore? What does patience look like in a portfolio? Those questions create durable learning.",
        ],
      },
      {
        title: "What should a user focus on first?",
        paragraphs: [
          "A new user should first understand four things: how a virtual balance works, why diversification matters, how rankings reflect behavior over time, and why AI signals should be read as educational context rather than direct commands.",
          "The healthiest first journey is simple: register, receive the virtual balance, place one small virtual trade, join a league, and then review the decision through the AI assistant. That sequence teaches platform logic and market logic together.",
        ],
      },
    ] as const;
  }

  return [
    {
      title: "Enbilir tam olarak nedir?",
      paragraphs: [
        "Enbilir, eğitim odaklı bir sanal portföy platformudur. Kullanıcı borsa hesabı bağlamaz, gerçek emir göndermez ve gerçek sermayesini piyasaya maruz bırakmaz. Bunun yerine sanal portföy oluşturarak, kararlarını kıyaslayarak ve sonuçları topluluk içinde tartışarak piyasayı öğrenir.",
        "Platform özellikle Rotary, Rotaract ve Interact toplulukları için güçlüdür; çünkü finansal okuryazarlığı sosyal motivasyonla birleştirir. Kullanıcı sadece teori okumaz; lige katılır, performansını takip eder ve piyasa sinyallerini başkalarıyla birlikte yorumlar.",
      ],
    },
    {
      title: "Simülasyon temelli öğrenme neden değerlidir?",
      paragraphs: [
        "Yeni başlayanların çoğu bilgi eksikliğinden değil; piyasa bilgisinin hızlı, teknik ve duygusal baskı içeren yapısından zorlanır. Simülasyon ortamı korkuyu azaltır ve kişiye pratik yapma alanı açar. Daha iyi alışkanlıklar tam olarak bu alanda oluşur.",
        "Kullanıcı gerçek para baskısı olmadan portföy kararı verebildiğinde daha iyi sorular sormaya başlar: Bu varlığı neden seçtim? Hangi riski görmezden geldim? Portföyde sabır neye benzer? Kalıcı öğrenme bu sorularla güçlenir.",
      ],
    },
    {
      title: "Kullanıcı ilk olarak neye odaklanmalı?",
      paragraphs: [
        "Yeni bir kullanıcı önce dört şeyi anlamalıdır: sanal bakiyenin nasıl çalıştığı, çeşitlendirmenin neden önemli olduğu, sıralamanın zaman içindeki davranışı nasıl yansıttığı ve AI sinyallerinin doğrudan komut değil eğitim bağlamı olarak nasıl okunacağı.",
        "En sağlıklı ilk yolculuk şudur: kayıt ol, sanal bakiyeni al, küçük bir sanal işlem yap, bir lige katıl ve ardından bu kararı AI asistan üzerinden gözden geçir. Bu sıra hem platform mantığını hem piyasa mantığını birlikte öğretir.",
      ],
    },
  ] as const;
}

function getFaqItems(locale: string) {
  if (locale === "en") {
    return [
      {
        question: "Is real money used on Enbilir?",
        answer: "No. Enbilir is built around virtual portfolios and educational flows. Users observe real market data, but they do not place real-money orders through the platform.",
      },
      {
        question: "Who is this platform for?",
        answer: "It is suitable for beginners, curious learners, community-based groups, and especially Rotary-focused circles that want to combine learning with friendly competition.",
      },
      {
        question: "What does the AI assistant do?",
        answer: "The AI assistant scans public data, summarizes technical context, and helps users interpret signals. It is designed as a learning support layer, not as an investment advisory engine.",
      },
      {
        question: "Why are leagues important?",
        answer: "Leagues turn individual learning into social momentum. A user is more likely to return, reflect, and improve when there is a visible group rhythm around them.",
      },
    ] as const;
  }

  return [
    {
      question: "Enbilir’de gerçek para kullanılıyor mu?",
      answer: "Hayır. Enbilir sanal portföy ve eğitim akışı üstüne kuruludur. Kullanıcı gerçek piyasa verisini izler ama platform üzerinden gerçek para emri göndermez.",
    },
    {
      question: "Bu platform kimler için uygun?",
      answer: "Yeni başlayanlar, öğrenmeye meraklı kullanıcılar, topluluk bazlı gruplar ve özellikle Rotary çevresi içinde dostça rekabet ile öğrenmek isteyen kişiler için uygundur.",
    },
    {
      question: "AI asistan tam olarak ne yapar?",
      answer: "AI asistanı açık veriyi tarar, teknik bağlamı özetler ve kullanıcının sinyalleri yorumlamasına yardım eder. Yatırım danışmanlığı motoru değil, öğrenme destek katmanıdır.",
    },
    {
      question: "Ligler neden önemli?",
      answer: "Ligler bireysel öğrenmeyi sosyal ritme dönüştürür. Kullanıcı çevresinde görünür bir grup akışı olduğunda platforma geri dönme, düşünme ve gelişme ihtimali artar.",
    },
  ] as const;
}

function getStrategicCards(locale: string) {
  if (locale === "en") {
    return [
      {
        eyebrow: "Community",
        title: "Private league structure",
        body: "Run a learning-based portfolio competition for Rotary, Rotaract, Interact, or your own private group.",
      },
      {
        eyebrow: "Education",
        title: "AI-supported interpretation",
        body: "The AI Market Assistant explains technical signals in plain language so members can learn faster together.",
      },
      {
        eyebrow: "Momentum",
        title: "Visible progress",
        body: "Leaderboards, portfolio changes, and recurring radar updates keep participation lively without real-money risk.",
      },
    ] as const;
  }

  return [
    {
      eyebrow: "Topluluk",
      title: "Özel lig kurgusu",
      body: "Rotary, Rotaract, Interact veya kendi özel grubun için öğrenme odaklı portföy yarışması kurgula.",
    },
    {
      eyebrow: "Eğitim",
      title: "AI destekli yorumlama",
      body: "AI Piyasa Asistanı teknik sinyalleri sade bir dille açıklar; üyeler birlikte daha hızlı öğrenir.",
    },
    {
      eyebrow: "Devamlılık",
      title: "Görünür ilerleme",
      body: "Liderlik tablosu, portföy değişimi ve radar güncellemeleri gerçek para baskısı olmadan katılımı canlı tutar.",
    },
  ] as const;
}

function getTrustHighlights(locale: string) {
  if (locale === "en") {
    return [
      {
        title: "No real-money trading",
        body: "Members can practice decisions, compare outcomes, and build a language around risk without connecting an exchange account.",
      },
      {
        title: "Education-first AI",
        body: "The assistant is framed as decision support and interpretation, not a black-box signal machine.",
      },
      {
        title: "Admin-controlled communication",
        body: "Announcements, blog posts, and education modules can be updated centrally to keep the community message aligned.",
      },
    ] as const;
  }

  return [
    {
      title: "Gerçek para işlemi yok",
      body: "Üyeler borsa hesabı bağlamadan karar pratiği yapar, sonuçları kıyaslar ve risk dili geliştirir.",
    },
    {
      title: "Eğitim öncelikli AI",
      body: "Asistan, kapalı kutu sinyal motoru gibi değil; karar destek ve yorumlama katmanı olarak konumlanır.",
    },
    {
      title: "Merkezden yönetilen iletişim",
      body: "Duyuru, blog ve eğitim modülleri tek merkezden güncellenerek topluluk mesajı tutarlı tutulur.",
    },
  ] as const;
}

function getSpotlightMetrics(locale: string) {
  if (locale === "en") {
    return [
      {
        value: "3x",
        label: "Stronger engagement loop",
        body: "Leagues, rankings, and portfolio visibility create more reasons to return than a simple course page.",
      },
      {
        value: "24/7",
        label: "Always-on learning surface",
        body: "Market data, watchlists, and AI summaries keep the platform active between community meetings.",
      },
      {
        value: "0",
        label: "Real-money pressure",
        body: "Members can experiment confidently because the environment is educational and simulation-based.",
      },
    ] as const;
  }

  return [
    {
      value: "3x",
      label: "Daha güçlü geri dönüş döngüsü",
      body: "Ligler, sıralamalar ve portföy görünürlüğü klasik bir eğitim sayfasından daha fazla geri gelme sebebi üretir.",
    },
    {
      value: "7/24",
      label: "Sürekli açık öğrenme zemini",
      body: "Piyasa verisi, izleme listeleri ve AI özetleri topluluk buluşmaları dışında da platformu canlı tutar.",
    },
    {
      value: "0",
      label: "Gerçek para baskısı",
      body: "Ortam tamamen eğitim ve simülasyon temelli olduğu için kullanıcılar güvenle deneme yapabilir.",
    },
  ] as const;
}

function PerformanceBadges({ periods, copy }: { periods: PortfolioPerformancePeriod[]; copy: ReturnType<typeof getUiCopy>["home"] }) {
  if (periods.length === 0) {
    return <p className="mt-4 rounded-md bg-[#f8fafc] p-3 text-xs leading-5 text-slate-500">{copy.noEnoughData}</p>;
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {periods.map((period) => {
        const tone =
          period.change === null || Math.abs(period.change) < 0.0000001
            ? "bg-slate-100 text-slate-600"
            : period.change > 0
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-red-50 text-red-700 ring-red-200";

        return (
          <div key={period.key} className={`rounded-md px-2.5 py-2 text-xs font-black ring-1 ring-inset ${tone}`}>
            <span className="block text-[10px] uppercase tracking-[0.12em] opacity-70">{copy.periodLabels[period.key]}</span>
            <span>{period.change === null ? copy.noEnoughDataShort : formatPercent(period.change, true)}</span>
          </div>
        );
      })}
    </div>
  );
}

function translateRankingPeriod(label: string, periodLabels: ReturnType<typeof getUiCopy>["home"]["periodLabels"]) {
  const normalized = label.toLowerCase();

  if (normalized.includes("haft") || normalized.includes("week")) {
    return periodLabels.WEEKLY;
  }

  if (normalized.includes("3")) {
    return periodLabels.QUARTERLY;
  }

  if (normalized.includes("6")) {
    return periodLabels.SEMI_ANNUAL;
  }

  if (normalized.includes("yıl") || normalized.includes("year")) {
    return periodLabels.YEARLY;
  }

  if (normalized.includes("ay") || normalized.includes("month")) {
    return periodLabels.MONTHLY;
  }

  return label;
}

function formatPercent(value: number, signed = false) {
  const absValue = Math.abs(value);
  const decimals = absValue > 0 && absValue < 1 ? 4 : 2;
  const prefix = signed && value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(decimals)}%`;
}

function NewsList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <PremiumCard interactive className="home-news-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-black text-[#152033]">{title}</h2>
        <HomeMotionCue variant="line" />
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <p key={item} className="home-news-row text-sm leading-6 text-slate-600">{item}</p>
        ))}
      </div>
    </PremiumCard>
  );
}
