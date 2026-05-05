import Link from "next/link";
import { randomUUID } from "crypto";
import { AdBanner } from "@/components/AdBanner";
import { FormMessage } from "@/components/FormMessage";
import { PortfolioBreakdown } from "@/components/PortfolioBreakdown";
import { PortfolioDonut } from "@/components/PortfolioDonut";
import { TradeTicketForm } from "@/components/TradeTicketForm";
import { getSafeLocale } from "@/i18n/config";
import { getAds } from "@/lib/ads";
import { tradeAction, updateCashModeAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { getLiveMarketItems } from "@/lib/live-market";
import { formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";
import { getPortfolioBreakdownItems } from "@/lib/portfolio-breakdown";

export default async function TradePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();

  if (!user) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-2xl font-black">Giriş gerekli</h1>
        <p className="mt-2 text-sm">Sanal işlem yapabilmek için giriş yapmalısın.</p>
        <Link href={`/${locale}/giris`} className="premium-cta mt-5 inline-flex px-4 py-2 text-sm font-bold">Giriş yap</Link>
      </section>
    );
  }

  const [topAds, sideAds, bottomAds, marketItems, snapshot] = await Promise.all([
    getAds("trade_top"),
    getAds("trade_right"),
    getAds("trade_bottom"),
    getLiveMarketItems(),
    getPortfolioSnapshot(user.id),
  ]);
  const breakdownItems = getPortfolioBreakdownItems(snapshot);

  return (
    <div className="grid gap-6">
      <FormMessage message={query.error} />
      <FormMessage message={query.success} tone="success" />
      <AdBanner ads={topAds} />
      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <div className="glass-card rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-black text-[#152033]">Sanal işlem yap</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Gerçek emir gönderilmez; işlemler eğitim amaçlı sanal portföye yazılır.</p>
            <TradeTicketForm locale={locale} userId={user.id} marketItems={marketItems} idempotencyKey={randomUUID()} action={tradeAction} />
          </div>

          <div className="glass-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-black text-[#152033]">Nakit tercihi</h2>
            <form action={updateCashModeAction} className="mt-4 flex flex-wrap gap-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="userId" value={user.id} />
              {["USD", "EUR", "CHF", "TRY_REPO"].map((mode) => (
                <button key={mode} name="cashMode" value={mode} className="rounded-md border border-slate-300 bg-white/70 px-4 py-2 text-sm font-black text-slate-700 hover:border-[#0f766e] hover:shadow-md">{mode}</button>
              ))}
            </form>
          </div>
          <AdBanner ads={bottomAds} variant="bottom" />
        </div>

        <aside className="grid content-start gap-5">
          <div className="premium-card premium-card--interactive p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Toplam portföy</p>
            <p className="mt-2 text-2xl font-black text-[#0f766e]">{formatMoney(snapshot.totalValueUsd)}</p>
            <PortfolioDonut
              total={snapshot.totalValueUsd}
              animated
              items={[
                { label: "Nakit", value: snapshot.cashValueUsd },
                ...snapshot.positions.map((position) => ({ label: position.symbol, value: position.valueUsd })),
              ]}
            />
            <p className="mt-3 text-sm text-slate-600">Kalan nakit: {formatMoney(snapshot.cashValueUsd)}</p>
            <div className="mt-4">
              <PortfolioBreakdown items={breakdownItems} />
            </div>
          </div>
          <AdBanner ads={sideAds} variant="side" />
        </aside>
      </section>
    </div>
  );
}
