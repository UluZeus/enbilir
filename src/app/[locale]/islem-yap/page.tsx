import Link from "next/link";
import { AdBanner } from "@/components/AdBanner";
import { FormMessage } from "@/components/FormMessage";
import { PortfolioDonut } from "@/components/PortfolioDonut";
import { getSafeLocale } from "@/i18n/config";
import { getAds } from "@/lib/ads";
import { tradeAction, updateCashModeAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { getLiveMarketItems } from "@/lib/live-market";
import { formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";

export default async function TradePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string }>;
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

  return (
    <div className="grid gap-6">
      <FormMessage message={query.error} />
      <AdBanner ads={topAds} />
      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <div className="glass-card rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-black text-[#152033]">Sanal işlem yap</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Gerçek emir gönderilmez; işlemler eğitim amaçlı sanal portföye yazılır.</p>
            <form action={tradeAction} className="mt-5 grid gap-4 md:grid-cols-4 md:items-end">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="userId" value={user.id} />
              <label className="grid gap-2 text-sm font-bold text-slate-700">Ürün<select name="symbol" className="rounded-md border border-slate-300 px-4 py-3 font-normal">{marketItems.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol} - {item.name}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">İşlem<select name="side" className="rounded-md border border-slate-300 px-4 py-3 font-normal"><option value="BUY">Al</option><option value="SELL">Sat</option></select></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Tutar USD<input name="amountUsd" type="number" min="1" step="1" className="rounded-md border border-slate-300 px-4 py-3 font-normal" /></label>
              <button className="premium-cta px-5 py-3 text-sm font-black">İşlemi uygula</button>
            </form>
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
              items={[
                { label: "Nakit", value: snapshot.cashValueUsd },
                ...snapshot.positions.map((position) => ({ label: position.symbol, value: position.valueUsd })),
              ]}
            />
            <p className="mt-3 text-sm text-slate-600">Kalan nakit: {formatMoney(snapshot.cashValueUsd)}</p>
            {snapshot.positions.length === 0 ? (
              <p className="mt-3 rounded-md bg-[#f8fafc] p-3 text-xs leading-5 text-slate-500">
                Portföyünde henüz yatırım ürünü yok. İlk sanal alımını yaptığında dağılım burada nakit dışındaki varlıklarla birlikte görünür.
              </p>
            ) : null}
          </div>
          <AdBanner ads={sideAds} variant="side" />
        </aside>
      </section>
    </div>
  );
}
