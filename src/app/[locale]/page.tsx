import Link from "next/link";
import type { Metadata } from "next";
import { HomeHeroDataFlow } from "@/components/home/HomeMotion";
import { VipAgentPublicSummary } from "@/components/vip-agents/VipAgentViews";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { getOnboardingProgress } from "@/lib/onboarding";
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
    const progress = await getOnboardingProgress(user.id);
    return <MemberHome locale={locale} name={user.name} progress={progress} latestReportId={latestReport?.id} vipAgents={vipAgents} />;
  }

  return <GuestHome locale={locale} latestReportId={latestReport?.id} vipAgents={vipAgents} />;
}

function GuestHome({ locale, latestReportId, vipAgents }: { locale: "tr" | "en"; latestReportId?: string; vipAgents: Awaited<ReturnType<typeof getVipAgentSummaries>> }) {
  const tr = locale === "tr";
  const reportHref = latestReportId ? `/${locale}/ai-piyasa-asistani/raporlar/${latestReportId}` : `/${locale}/ai-piyasa-asistani/raporlar`;
  const features = tr ? [
    ["Sanal portföy", "Gerçek para riski olmadan piyasa kararlarını dene ve sonuçlarını takip et."],
    ["AI ile öğrenme", "Piyasa verisini emir olarak değil, kanıt ve risk bağlamıyla okumayı öğren."],
    ["Lig ve rapor ritmi", "Topluluğunla ilerle; günlük ve haftalık raporlarla kararlarını gözden geçir."],
  ] : [
    ["Virtual portfolio", "Practice market decisions without risking real money and observe the outcome."],
    ["Learning with AI", "Read market data through evidence and risk context, never as an automatic order."],
    ["League and report rhythm", "Progress with your community and review decisions through scheduled reports."],
  ];
  const steps = tr ? ["Ücretsiz hesabını oluştur", "Ligini ve risk profilini seç", "Küçük bir sanal işlem yap", "Raporla gözden geçir"] : ["Create your free account", "Choose your league and risk profile", "Place a small virtual trade", "Review it with a report"];

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#07101d] text-white shadow-2xl">
        <div className="grid min-h-[520px] items-center gap-6 p-6 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] md:p-10">
          <div>
            <p className="text-xs font-black uppercase text-cyan-200">{tr ? "Yapay zeka destekli piyasa akademisi" : "AI-assisted market academy"}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-6xl">{tr ? "Gerçek para riske atmadan piyasayı öğren" : "Learn markets without risking real money"}</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">{tr ? "Sanal portföy, AI piyasa araçları, makro raporlar ve ligler tek bir düzenli öğrenme akışında." : "Virtual portfolio, AI market tools, macro reports, and leagues in one guided learning flow."}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/${locale}/kayit`} className="premium-cta px-5 py-3 text-sm font-black">{tr ? "Ücretsiz başla" : "Start free"}</Link>
              <Link href={`/${locale}/ogren`} className="rounded-md border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white">{tr ? "Nasıl çalışır?" : "How does it work?"}</Link>
              <Link href={reportHref} className="rounded-md border border-cyan-300/30 px-5 py-3 text-sm font-black text-cyan-100">{tr ? "Son raporu oku" : "Read latest report"}</Link>
            </div>
          </div>
          <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-white/10 bg-white/5"><HomeHeroDataFlow /></div>
        </div>
      </section>

      <VipAgentPublicSummary agents={vipAgents} locale={locale} />

      <section className="grid gap-3 md:grid-cols-3">
        {features.map(([title, body], index) => (
          <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-black text-[#0f766e]">0{index + 1}</span>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-black uppercase text-[#0f766e]">{tr ? "Basit başlangıç" : "A simple start"}</p>
        <h2 className="mt-2 text-2xl font-black text-[#152033]">{tr ? "Her şeyi bir anda öğrenmen gerekmiyor" : "You do not need to learn everything at once"}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => <div key={step} className="rounded-lg bg-slate-50 p-4"><span className="text-sm font-black text-[#0f766e]">{index + 1}</span><p className="mt-2 text-sm font-black text-[#152033]">{step}</p></div>)}
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 md:flex md:items-center md:justify-between">
        <div><h2 className="text-xl font-black">{tr ? "Eğitim ve simülasyon öncelikli" : "Education and simulation first"}</h2><p className="mt-2 max-w-3xl text-sm leading-6">{tr ? "Enbilir gerçek para işlemi yaptırmaz. AI yorumları ve raporlar yatırım tavsiyesi değil, finansal okuryazarlık bağlamıdır." : "Enbilir does not execute real-money trades. AI interpretations and reports are financial-literacy context, not investment advice."}</p></div>
        <Link href={`/${locale}/kayit`} className="premium-cta mt-4 inline-flex shrink-0 px-5 py-3 text-sm font-black md:mt-0">{tr ? "Hesabını oluştur" : "Create account"}</Link>
      </section>
    </div>
  );
}

function MemberHome({ locale, name, progress, latestReportId, vipAgents }: { locale: "tr" | "en"; name: string; progress: Awaited<ReturnType<typeof getOnboardingProgress>>; latestReportId?: string; vipAgents: Awaited<ReturnType<typeof getVipAgentSummaries>> }) {
  const tr = locale === "tr";
  const actions = [
    { href: progress.nextStep ? "baslangic" : "panel", title: progress.nextStep ? (tr ? "Başlangıca devam et" : "Continue getting started") : (tr ? "Paneli aç" : "Open dashboard"), body: tr ? `%${progress.percent} tamamlandı` : `${progress.percent}% complete` },
    { href: "islem-yap", title: tr ? "Sanal portföy" : "Virtual portfolio", body: tr ? "İşlem yap ve karar notunu yaz" : "Trade and write a decision note" },
    { href: "ai-piyasa-asistani?tab=summary", title: tr ? "AI piyasa araçları" : "AI market tools", body: tr ? "Özetle başla, gerekirse terminale geç" : "Start with the summary, then open terminal" },
    { href: latestReportId ? `ai-piyasa-asistani/raporlar/${latestReportId}` : "ai-piyasa-asistani/raporlar", title: tr ? "Son rapor" : "Latest report", body: tr ? "Piyasa bağlamını gözden geçir" : "Review the market context" },
  ];
  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-800 bg-[#07101d] p-6 text-white shadow-xl md:p-8">
        <p className="text-xs font-black uppercase text-cyan-200">{tr ? "Kişisel çalışma alanın" : "Your personal workspace"}</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">{tr ? `Hoş geldin, ${name}` : `Welcome, ${name}`}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">{tr ? "Bugün tek bir anlamlı adım seç ve öğrenme düzenini sürdür." : "Choose one meaningful step today and keep your learning rhythm."}</p>
      </section>
      <VipAgentPublicSummary agents={vipAgents} locale={locale} />
      <section className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => <Link key={action.href} href={`/${locale}/${action.href}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-[#0f766e]"><h2 className="text-lg font-black text-[#152033]">{action.title}</h2><p className="mt-2 text-sm text-slate-600">{action.body}</p></Link>)}
      </section>
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5"><h2 className="text-lg font-black text-emerald-950">{tr ? "Haftalık düzen" : "Weekly rhythm"}</h2><p className="mt-2 text-sm leading-6 text-emerald-900">{tr ? "Bir rapor oku, bir karar gerekçesi yaz, portföyünü kontrol et ve sonra ligdeki istikrarını karşılaştır." : "Read one report, write one decision reason, review your portfolio, and only then compare consistency in your league."}</p></section>
    </div>
  );
}
