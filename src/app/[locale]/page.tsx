import Link from "next/link";
import type { Metadata } from "next";
import { HomeHeroDataFlow } from "@/components/home/HomeMotion";
import { MemberPortfolioOverview, type MemberPortfolioDonutItem } from "@/components/portfolio/MemberPortfolioOverview";
import { VipAgentPublicSummary } from "@/components/vip-agents/VipAgentViews";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { localizeMarketText } from "@/lib/market-data";
import { getOnboardingProgress } from "@/lib/onboarding";
import { getPortfolioPerformancePeriods, type PortfolioPerformancePeriod } from "@/lib/portfolio-history";
import { getPortfolioSnapshot } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { getVipAgentSummaries } from "@/lib/vip-agents/dashboard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/", page: "home" });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();
  const [latestReport, vipAgents] = await Promise.all([
    prisma.aiMarketReport.findFirst({ where: { scope: "GLOBAL" }, orderBy: { generatedAt: "desc" }, select: { id: true } }),
    getVipAgentSummaries(),
  ]);

  if (user) {
    const [progress, snapshot] = await Promise.all([
      getOnboardingProgress(user.id),
      getPortfolioSnapshot(user.id),
    ]);
    const performancePeriods = await getPortfolioPerformancePeriods(user.id, snapshot.totalValueUsd);
    const portfolioItems: MemberPortfolioDonutItem[] = [
      {
        label: locale === "tr" ? `Nakit / ${snapshot.cashCurrency}` : `Cash / ${snapshot.cashCurrency}`,
        value: snapshot.cashValueUsd,
        detail: snapshot.cashCurrency,
        profitLossPercent: null,
      },
      ...[...snapshot.positions]
        .sort((left, right) => right.valueUsd - left.valueUsd)
        .map((position) => ({
          label: position.symbol,
          detail: localizeMarketText(position.name, locale),
          value: position.valueUsd,
          profitLossPercent: position.competitionCostUsd > 0
            ? (position.profitLossUsd / position.competitionCostUsd) * 100
            : null,
        })),
    ];

    return (
      <MemberHome
        locale={locale}
        name={user.name}
        progress={progress}
        latestReportId={latestReport?.id}
        vipAgents={vipAgents}
        portfolio={{
          totalValueUsd: snapshot.totalValueUsd,
          cashValueUsd: snapshot.cashValueUsd,
          items: portfolioItems,
          performancePeriods,
        }}
      />
    );
  }

  return <GuestHome locale={locale} latestReportId={latestReport?.id} vipAgents={vipAgents} />;
}

function GuestHome({ locale, latestReportId, vipAgents }: { locale: "tr" | "en"; latestReportId?: string; vipAgents: Awaited<ReturnType<typeof getVipAgentSummaries>> }) {
  const tr = locale === "tr";
  const reportHref = latestReportId ? `/${locale}/ai-piyasa-asistani/raporlar/${latestReportId}` : `/${locale}/ai-piyasa-asistani/raporlar`;
  const features = tr ? [
    ["portfolio", "Sanal portföy", "Gerçek para riski olmadan piyasa kararlarını dene ve sonuçlarını takip et."],
    ["ai", "Kaynaklı AI analizi", "Piyasa verisini emir olarak değil, kanıt, risk ve alternatif senaryo bağlamıyla oku."],
    ["rhythm", "Ölçülen öğrenme ritmi", "Topluluğunla ilerle; raporlar ve performans geçmişiyle kararlarını gözden geçir."],
  ] : [
    ["portfolio", "Virtual portfolio", "Practice market decisions without risking real money and observe the outcome."],
    ["ai", "Sourced AI analysis", "Read market data through evidence, risk, and alternative scenarios—not as an automatic order."],
    ["rhythm", "Measured learning rhythm", "Progress with your community and review decisions through reports and performance history."],
  ];
  const steps = tr ? ["Ücretsiz hesabını oluştur", "Ligini ve risk profilini seç", "Küçük bir sanal işlem yap", "Raporla gözden geçir"] : ["Create your free account", "Choose your league and risk profile", "Place a small virtual trade", "Review it with a report"];

  return (
    <div className="home-page-v3 grid gap-7">
      <section className="home-hero-v3 overflow-hidden text-white">
        <div className="grid min-h-[470px] items-center gap-8 p-6 md:grid-cols-[minmax(0,1.04fr)_minmax(340px,0.96fr)] md:p-10 lg:p-12">
          <div>
            <p className="section-eyebrow-v3 section-eyebrow-v3--dark">{tr ? "Yapay zeka destekli piyasa akademisi" : "AI-assisted market academy"}</p>
            <h1 className="mt-4 max-w-3xl text-[clamp(2.4rem,5vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.045em]">{tr ? "Piyasayı deneyerek, ölçerek ve kanıtla öğren." : "Learn markets through practice, measurement, and evidence."}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">{tr ? "Sanal portföy, kaynaklı AI analizleri, makro raporlar ve ligler tek bir sakin çalışma akışında." : "Virtual portfolios, sourced AI analysis, macro reports, and leagues in one focused learning flow."}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/${locale}/kayit`} className="button-primary-v3 px-5 py-3 text-sm font-bold">{tr ? "Ücretsiz başla" : "Start free"}</Link>
              <Link href={`/${locale}/ogren`} className="button-secondary-dark-v3 px-5 py-3 text-sm font-semibold">{tr ? "Nasıl çalışır?" : "How it works"}</Link>
              <Link href={reportHref} className="button-quiet-dark-v3 px-4 py-3 text-sm font-semibold">{tr ? "Son rapor" : "Latest report"} <span aria-hidden="true">→</span></Link>
            </div>
            <ul className="home-trust-list-v3 mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-300" aria-label={tr ? "Platform güvenceleri" : "Platform assurances"}>
              <li><span aria-hidden="true">✓</span> {tr ? "Sanal işlem" : "Virtual trading"}</li>
              <li><span aria-hidden="true">✓</span> {tr ? "Kaynaklı AI" : "Sourced AI"}</li>
              <li><span aria-hidden="true">✓</span> {tr ? "Ölçülen performans" : "Measured performance"}</li>
            </ul>
          </div>
          <div className="home-product-preview-v3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-200">{tr ? "Ürün önizlemesi" : "Product preview"}</p><p className="mt-1 text-sm font-semibold text-white">{tr ? "Karar çalışma alanı" : "Decision workspace"}</p></div>
              <span className="home-live-badge-v3">{tr ? "Sanal" : "Virtual"}</span>
            </div>
            <div className="min-h-[260px]"><HomeHeroDataFlow /></div>
            <div className="grid grid-cols-3 border-t border-white/10 text-center">
              {[tr ? "Portföy" : "Portfolio", tr ? "AI karne" : "AI scorecard", tr ? "Rapor" : "Report"].map((label) => <span key={label} className="px-2 py-3 text-[11px] font-semibold text-slate-300">{label}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="home-foundation-title">
        <div className="mb-4 max-w-3xl">
          <p className="section-eyebrow-v3">{tr ? "Temel yaklaşım" : "Core approach"}</p>
          <h2 id="home-foundation-title" className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">{tr ? "Gürültü yerine düzenli karar pratiği" : "Structured decision practice over market noise"}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
        {features.map(([icon, title, body]) => (
          <article key={title} className="surface-card-v3 p-5 md:p-6">
            <span className="feature-icon-v3" aria-hidden="true"><HomeFeatureIcon name={icon} /></span>
            <h3 className="mt-5 text-xl font-bold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </article>
        ))}
        </div>
      </section>

      <div className="home-agent-strip-v3"><VipAgentPublicSummary agents={vipAgents} locale={locale} /></div>

      <section className="surface-card-v3 p-6 md:p-8">
        <p className="section-eyebrow-v3">{tr ? "Basit başlangıç" : "A simple start"}</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{tr ? "Her şeyi bir anda öğrenmen gerekmiyor" : "You do not need to learn everything at once"}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => <div key={step} className="home-step-v3 p-4"><span className="text-xs font-bold text-teal-700">0{index + 1}</span><p className="mt-2 text-sm font-semibold text-slate-900">{step}</p></div>)}
        </div>
      </section>

      <section className="home-disclosure-v3 p-6 md:flex md:items-center md:justify-between md:gap-8">
        <div><h2 className="text-lg font-bold text-slate-950">{tr ? "Eğitim ve simülasyon öncelikli" : "Education and simulation first"}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{tr ? "Enbilir gerçek para işlemi yaptırmaz. AI yorumları ve raporlar yatırım tavsiyesi değil, finansal okuryazarlık bağlamıdır." : "Enbilir does not execute real-money trades. AI interpretations and reports are financial-literacy context, not investment advice."}</p></div>
        <Link href={`/${locale}/kayit`} className="button-primary-v3 mt-4 inline-flex shrink-0 px-5 py-3 text-sm font-bold md:mt-0">{tr ? "Hesabını oluştur" : "Create account"}</Link>
      </section>
    </div>
  );
}

function MemberHome({
  locale,
  name,
  progress,
  latestReportId,
  vipAgents,
  portfolio,
}: {
  locale: "tr" | "en";
  name: string;
  progress: Awaited<ReturnType<typeof getOnboardingProgress>>;
  latestReportId?: string;
  vipAgents: Awaited<ReturnType<typeof getVipAgentSummaries>>;
  portfolio: {
    totalValueUsd: number;
    cashValueUsd: number;
    items: MemberPortfolioDonutItem[];
    performancePeriods: PortfolioPerformancePeriod[];
  };
}) {
  const tr = locale === "tr";
  const actions = [
    { href: progress.nextStep ? "baslangic" : "panel", title: progress.nextStep ? (tr ? "Bugünün adımı: başlangıca devam et" : "Today's step: continue getting started") : (tr ? "Bugünün adımı: panelini gözden geçir" : "Today's step: review your dashboard"), body: tr ? `%${progress.percent} tamamlandı · kaldığın yerden devam et` : `${progress.percent}% complete · continue where you left off`, priority: true, icon: "path" },
    { href: "islem-yap", title: tr ? "Sanal portföy" : "Virtual portfolio", body: tr ? "Pozisyonlarını kontrol et ve karar notunu yaz" : "Review positions and write a decision note", priority: false, icon: "portfolio" },
    { href: "ai-piyasa-asistani?tab=summary", title: tr ? "AI piyasa araçları" : "AI market tools", body: tr ? "Özetle başla, kanıt gerekiyorsa derinleş" : "Start with the summary and go deeper for evidence", priority: false, icon: "ai" },
    { href: latestReportId ? `ai-piyasa-asistani/raporlar/${latestReportId}` : "ai-piyasa-asistani/raporlar", title: tr ? "Son piyasa raporu" : "Latest market report", body: tr ? "Makro bağlamı ve riskleri gözden geçir" : "Review macro context and risks", priority: false, icon: "report" },
  ];
  return (
    <div className="member-home-v3 grid gap-6">
      <section className="member-hub-hero-v3 p-6 text-white md:p-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
          <div>
            <p className="section-eyebrow-v3 section-eyebrow-v3--dark">{tr ? "Bugünün çalışma merkezi" : "Today's workspace"}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] md:text-4xl">{tr ? `Hoş geldin, ${name}` : `Welcome, ${name}`}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{tr ? "Tek bir anlamlı adımla başla; portföy, rapor ve öğrenme akışın burada." : "Start with one meaningful step; your portfolio, report, and learning flow are here."}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300"><span>{tr ? "Başlangıç ilerlemesi" : "Getting started"}</span><span>%{progress.percent}</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-teal-300" style={{ width: `${progress.percent}%` }} /></div>
          </div>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.28fr)] xl:items-start">
        <section className="order-2 grid content-start gap-4 sm:grid-cols-2 xl:order-1 xl:grid-cols-1" aria-label={tr ? "Günlük çalışma adımları" : "Daily workspace actions"}>
          {actions.map((action) => <Link key={action.href} href={`/${locale}/${action.href}`} className={`member-action-card-v3 group p-5 ${action.priority ? "sm:col-span-2 md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-5 md:p-6 xl:col-span-1 xl:block" : ""}`}>
            <span className="feature-icon-v3" aria-hidden="true"><HomeFeatureIcon name={action.icon} /></span>
            <span className={action.priority ? "mt-4 block md:mt-0 xl:mt-4" : "mt-4 block"}><strong className="block text-lg font-bold text-slate-950">{action.title}</strong><span className="mt-1 block text-sm leading-6 text-slate-600">{action.body}</span></span>
            <span className={action.priority ? "mt-4 inline-flex text-sm font-bold text-teal-700 md:mt-0 xl:mt-4" : "mt-4 inline-flex text-sm font-bold text-teal-700"}>{tr ? "Aç" : "Open"} <span className="ml-1 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></span>
          </Link>)}
        </section>
        <div className="order-1 min-w-0 xl:order-2">
          <MemberPortfolioOverview
            locale={locale}
            totalValueUsd={portfolio.totalValueUsd}
            cashValueUsd={portfolio.cashValueUsd}
            items={portfolio.items}
            performancePeriods={portfolio.performancePeriods}
          />
        </div>
      </div>
      <div className="home-agent-strip-v3"><VipAgentPublicSummary agents={vipAgents} locale={locale} /></div>
      <section className="weekly-rhythm-v3 p-5"><p className="section-eyebrow-v3">{tr ? "Haftalık düzen" : "Weekly rhythm"}</p><h2 className="mt-2 text-lg font-bold text-slate-950">{tr ? "Oku · gerekçelendir · kontrol et · karşılaştır" : "Read · reason · review · compare"}</h2><p className="mt-2 text-sm leading-6 text-slate-700">{tr ? "Bir rapor oku, bir karar gerekçesi yaz, portföyünü kontrol et ve ancak sonra ligdeki istikrarını karşılaştır." : "Read one report, write one decision reason, review your portfolio, and only then compare consistency in your league."}</p></section>
    </div>
  );
}

function HomeFeatureIcon({ name }: { name: string }) {
  if (name === "portfolio") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /></svg>;
  if (name === "ai") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2m0-12-2 2M8 16l-2 2" /><circle cx="12" cy="12" r="4" /></svg>;
  if (name === "report") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6" /></svg>;
  if (name === "path") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18c5 0 2-10 8-11" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
}
