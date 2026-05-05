import Link from "next/link";
import { notFound } from "next/navigation";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { getLeagueDetail, getLeagueLeaderboard, leagueTypeLabels } from "@/lib/leagues";
import { formatMoney } from "@/lib/portfolio";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();
  const league = await getLeagueDetail(slug);

  if (!league || !league.isActive) {
    notFound();
  }

  const membership = user ? league.memberships.find((item) => item.userId === user.id) : null;
  const leaderboard = await getLeagueLeaderboard(league.id, user?.id);

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[#d9a441]/30 bg-[#101827] p-6 text-white shadow-sm">
        <Link href={`/${locale}/ligler`} className="text-sm font-bold text-[#f5a623] hover:text-[#ffd36b]">
          ← Liglere dön
        </Link>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">
              {leagueTypeLabels[league.type]}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">{league.name}</h1>
            {league.description ? <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{league.description}</p> : null}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Üye sayısı</p>
            <p className="mt-2 text-3xl font-black text-[#f5a623]">{league._count.memberships}</p>
            {membership?.role === "OWNER" ? <p className="mt-2 text-xs text-slate-300">Davet kodu: {league.inviteCode}</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Durumun</p>
          <p className="mt-2 text-xl font-black text-[#152033]">{membership ? membership.role : "Üye değilsin"}</p>
        </div>
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Lig derecen</p>
          <p className="mt-2 text-xl font-black text-[#0f766e]">
            {leaderboard.currentUserRank ? `${leaderboard.currentUserRank}. sıra` : "-"}
          </p>
        </div>
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Katılım</p>
          <Link href={`/${locale}/panel`} className="mt-2 inline-flex rounded-md bg-[#101827] px-4 py-2 text-sm font-black text-white">
            Panelden katıl
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">Lig içi liderlik</p>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">Sıralama</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {leaderboard.rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">Bu ligde henüz üye yok.</p>
          ) : (
            leaderboard.rows.map((row) => (
              <div key={row.membershipId} className="grid gap-3 p-5 md:grid-cols-[80px_1fr_160px_160px] md:items-center">
                <p className="text-2xl font-black text-[#f5a623]">#{row.rank}</p>
                <div>
                  <p className="font-black text-[#152033]">{row.displayName}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{row.role}</p>
                </div>
                <p className="font-black text-[#152033]">{formatMoney(row.totalValueUsd)}</p>
                <p className={row.profitLossUsd >= 0 ? "font-black text-[#0f766e]" : "font-black text-red-600"}>
                  {row.profitLossPercent.toFixed(2)}%
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
