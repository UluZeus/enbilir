import Link from "next/link";
import { MarketAssistantDashboard } from "@/components/ai-market/MarketAssistantDashboard";
import { getSessionUser } from "@/lib/auth";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { AI_MARKET_SYMBOLS } from "@/lib/ai-market/symbols";
import { prisma } from "@/lib/prisma";

export default async function AiMarketAssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).ai;
  const guidance = getAiGuidance(locale);
  const user = await getSessionUser();
  const latestReport = await prisma.aiMarketReport.findFirst({
    where: user ? { OR: [{ userId: user.id }, { scope: "GLOBAL" }] } : { scope: "GLOBAL" },
    orderBy: { generatedAt: "desc" },
    select: { id: true, generatedAt: true, marketRegime: true, riskAppetite: true, fallbackUsed: true },
  });

  return (
    <div className="min-h-screen bg-[#030711] px-3 py-4 md:px-5">
      <section className="mx-auto mb-4 grid max-w-[1600px] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[1.5rem] border border-slate-800 bg-[#07101d] p-5 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">
            {locale === "tr" ? "AI rehberi" : "AI guide"}
          </p>
          <h1 className="mt-2 text-3xl font-black">{copy.terminal}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            {locale === "tr"
              ? "Bu ekran sinyal kovalamak için değil, piyasa davranışını yorumlamayı öğrenmek için tasarlandı. Rotary topluluklarında ortak dil oluşturmak için teknik veri, özet ve radar akışını birlikte kullanın."
              : "This screen is designed to learn how to interpret market behavior, not to chase signals. Use the technical data, summaries, and radar flow together to build a shared language inside Rotary communities."}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {guidance.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-black text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-emerald-400/18 bg-emerald-400/8 p-5 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
            {locale === "tr" ? "Doğru kullanım" : "Use it well"}
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-sm font-black">{locale === "tr" ? "1. Radarı filtre olarak gör" : "1. Treat radar as a filter"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{locale === "tr" ? "Kayan banttaki fırsatları direkt emir mantığıyla değil, inceleme önceliği olarak kullan." : "Use the scrolling opportunities as a prioritization cue, not as an order trigger."}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-sm font-black">{locale === "tr" ? "2. Özeti göstergelerle doğrula" : "2. Validate the summary with indicators"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{locale === "tr" ? "Karar destek özetini teknik panelden ayrıştır; kullanıcıya neden-sonuç bağı kazandır." : "Separate the decision summary from the technical panel so the user learns cause and effect."}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="text-sm font-black">{locale === "tr" ? "3. Lig içinde tartış" : "3. Discuss it inside the league"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{locale === "tr" ? "Bu ekranın gerçek gücü topluluk içi yorum ve karşılaştırmalı öğrenmedir." : "The real power of this screen is shared interpretation and comparative learning inside the community."}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto mb-4 max-w-[1600px] rounded-md border border-cyan-300/20 bg-cyan-300/8 p-4 text-white shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">1 saatlik AI ajan raporu</p>
            {latestReport ? (
              <>
                <h2 className="mt-1 text-lg font-black">{latestReport.marketRegime ?? "Son piyasa raporu hazir"}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(latestReport.generatedAt)}
                  {latestReport.riskAppetite ? ` · ${latestReport.riskAppetite}` : ""}
                  {latestReport.fallbackUsed ? " · fallback" : ""}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-1 text-lg font-black">Ilk rapor cron calistiginda olusacak</h2>
                <p className="mt-1 text-sm text-slate-300">Makro sepet, haberler ve favori varliklar saatlik olarak yorumlanacak.</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {latestReport ? (
              <Link href={`/${locale}/ai-piyasa-asistani/raporlar/${latestReport.id}`} className="rounded-md border border-cyan-200 bg-cyan-100 px-3 py-2 text-sm font-black text-slate-950">
                Son raporu ac
              </Link>
            ) : null}
            <Link href={`/${locale}/ai-piyasa-asistani/raporlar`} className="rounded-md border border-white/15 bg-white/8 px-3 py-2 text-sm font-black text-white">
              Tum raporlar
            </Link>
          </div>
        </div>
      </section>
      <MarketAssistantDashboard locale={locale} symbols={AI_MARKET_SYMBOLS} />
    </div>
  );
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
