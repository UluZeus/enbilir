import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { getOnboardingProgress, type OnboardingStepId } from "@/lib/onboarding";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return {
    title: locale === "tr" ? "Kişisel Başlangıç Yolu | Enbilir" : "Personal Getting Started Path | Enbilir",
    robots: { index: false, follow: false },
  };
}

export default async function StartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/giris?message=${encodeURIComponent(locale === "tr" ? "Başlangıç adımları için giriş yapmalısın." : "Sign in to continue your getting-started steps.")}`);

  const progress = await getOnboardingProgress(user.id);
  const steps = getSteps(locale);
  const nextStep = progress.nextStep ? steps.find((step) => step.id === progress.nextStep) : undefined;
  const nextStepNumber = nextStep ? steps.findIndex((step) => step.id === nextStep.id) + 1 : null;

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <section className="premium-card p-6 sm:p-8">
        <p className="text-xs font-black uppercase text-[#0f766e]">{locale === "tr" ? "Kişisel başlangıç yolu" : "Personal getting-started path"}</p>
        <h1 className="mt-2 text-3xl font-black text-[#152033] sm:text-4xl">{locale === "tr" ? `Hoş geldin, ${user.name}` : `Welcome, ${user.name}`}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {locale === "tr" ? "Her şeyi bir anda öğrenmen gerekmiyor. Sıradaki adımı tamamla; ilerlemen hesabında saklansın ve sonraki girişinde buradan devam et." : "You do not need to learn everything at once. Complete the next step, keep your progress in your account, and continue here next time."}
        </p>
        <div className="mt-5" aria-label={locale === "tr" ? `Başlangıç ilerlemesi yüzde ${progress.percent}` : `Getting-started progress ${progress.percent} percent`}>
          <div className="flex items-center justify-between gap-4 text-sm font-black">
            <span className="text-slate-600">{locale === "tr" ? "İlerlemen" : "Your progress"}</span>
            <span className="text-[#0f766e]">%{progress.percent} · {progress.completedCount}/{progress.totalCount}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#0f766e]" style={{ width: `${progress.percent}%` }} /></div>
        </div>
      </section>

      {nextStep ? (
        <section className="rounded-lg border-2 border-[#0f766e] bg-white p-5 shadow-lg sm:p-6" aria-labelledby="next-step-title">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-sm font-black text-white">{nextStepNumber}</span>
            <p className="text-xs font-black uppercase text-[#0f766e]">{locale === "tr" ? "Şimdi bunu yap" : "Do this next"}</p>
          </div>
          <h2 id="next-step-title" className="mt-4 text-2xl font-black text-[#152033]">{nextStep.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{nextStep.body}</p>
          <Link href={`/${locale}/${nextStep.href}`} className="premium-cta mt-5 inline-flex min-h-12 w-full items-center justify-center px-5 py-3 text-sm font-black sm:w-auto">
            {nextStep.action}
          </Link>
        </section>
      ) : (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
          <h2 className="text-xl font-black">{locale === "tr" ? "Başlangıç tamamlandı" : "Getting started complete"}</h2>
          <p className="mt-2 text-sm leading-6">{locale === "tr" ? "Artık panelinden portföyünü, liglerini ve öğrenme düzenini tek yerden takip edebilirsin." : "You can now follow your portfolio, leagues, and learning routine from your dashboard."}</p>
          <Link href={`/${locale}/panel`} className="premium-cta mt-4 inline-flex px-4 py-2.5 text-sm font-black">{locale === "tr" ? "Panele geç" : "Open dashboard"}</Link>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="roadmap-title">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 id="roadmap-title" className="text-lg font-black text-[#152033]">{locale === "tr" ? "Başlangıç yol haritan" : "Your getting-started roadmap"}</h2>
          <p className="mt-1 text-sm text-slate-600">{locale === "tr" ? "Tamamlanan adımları yeniden açabilir, sıradaki aşamaları önceden görebilirsin." : "Reopen completed steps or preview what comes later."}</p>
        </div>
        <ol className="divide-y divide-slate-100">
          {steps.map((step, index) => {
            const done = progress.steps[step.id];
            const active = progress.nextStep === step.id;
            const status = done
              ? (locale === "tr" ? "Tamamlandı" : "Completed")
              : active
                ? (locale === "tr" ? "Sıradaki adım" : "Next step")
                : (locale === "tr" ? "Daha sonra" : "Later");
            return (
              <li key={step.id}>
                <Link href={`/${locale}/${step.href}`} aria-current={active ? "step" : undefined} className={`grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5 ${active ? "bg-emerald-50/70" : ""}`}>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${done ? "bg-emerald-100 text-emerald-800" : active ? "bg-[#0f766e] text-white" : "bg-slate-100 text-slate-600"}`}>{done ? "✓" : index + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-[#152033]">{step.title}</span>
                    <span className={`mt-0.5 block text-xs font-bold ${active ? "text-[#0f766e]" : done ? "text-emerald-700" : "text-slate-500"}`}>{status}</span>
                  </span>
                  <span aria-hidden="true" className="text-xl text-slate-400">›</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

type StartStep = { id: OnboardingStepId; title: string; body: string; href: string; action: string };

function getSteps(locale: "tr" | "en"): StartStep[] {
  if (locale === "en") return [
    { id: "league", title: "Choose your league", body: "Join the community context where you will learn and compare progress.", href: "ligler", action: "Choose league" },
    { id: "risk", title: "Understand your risk appetite", body: "Complete the awareness test before making your first virtual trade.", href: "risk-istahi-testi", action: "Start test" },
    { id: "guide", title: "Read the short guide", body: "See which pages to read and how the learning cycle works.", href: "kullanim-kilavuzu", action: "Read guide" },
    { id: "assistant", title: "Meet the AI Market tools", body: "Learn how the summary and terminal explain market context without giving orders.", href: "ai-piyasa-asistani?tab=summary", action: "Open AI guide" },
    { id: "chat", title: "Try AI chat", body: "Ask focused questions about evidence, risk, and alternative scenarios.", href: "ai-piyasa-asistani?tab=chat", action: "Open chat" },
    { id: "trade", title: "Place your first virtual trade", body: "Start small and write down why you made the decision.", href: "islem-yap", action: "Open portfolio" },
    { id: "reports", title: "Read one market report", body: "Separate trend, macro context, news, risk, and technical evidence.", href: "ai-piyasa-asistani/raporlar", action: "Open reports" },
    { id: "ranking", title: "Review the leaderboard last", body: "Compare consistency only after understanding your own process.", href: "liderlik-tablosu", action: "Open ranking" },
  ];

  return [
    { id: "league", title: "Ligini seç", body: "Öğreneceğin ve ilerlemeni karşılaştıracağın topluluk bağlamına katıl.", href: "ligler", action: "Lig seç" },
    { id: "risk", title: "Risk iştahını tanı", body: "İlk sanal işleminden önce farkındalık testini tamamla.", href: "risk-istahi-testi", action: "Testi başlat" },
    { id: "guide", title: "Kısa kılavuzu oku", body: "İşlem öncesinde hangi sayfaların okunacağını ve öğrenme döngüsünü gör.", href: "kullanim-kilavuzu", action: "Kılavuzu oku" },
    { id: "assistant", title: "AI Piyasa araçlarını tanı", body: "Özet ve terminalin emir vermeden piyasa bağlamını nasıl açıkladığını öğren.", href: "ai-piyasa-asistani?tab=summary", action: "AI rehberini aç" },
    { id: "chat", title: "AI sohbeti dene", body: "Kanıt, risk ve alternatif senaryolar hakkında odaklı sorular sor.", href: "ai-piyasa-asistani?tab=chat", action: "Sohbeti aç" },
    { id: "trade", title: "İlk sanal işlemini yap", body: "Küçük başla ve kararını neden verdiğini mutlaka yaz.", href: "islem-yap", action: "Portföyü aç" },
    { id: "reports", title: "Bir piyasa raporu oku", body: "Trend, makro bağlam, haber, risk ve teknik kanıtı birbirinden ayır.", href: "ai-piyasa-asistani/raporlar", action: "Raporları aç" },
    { id: "ranking", title: "En son liderliği incele", body: "Kendi sürecini anladıktan sonra istikrarını başkalarıyla karşılaştır.", href: "liderlik-tablosu", action: "Liderliği aç" },
  ];
}
