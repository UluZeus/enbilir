import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSafeLocale } from "@/i18n/config";
import { getDisplayName } from "@/lib/auth";
import { getBadgeDashboard } from "@/lib/badges";
import { calculatePortfolioHealth } from "@/lib/portfolio-health";
import { formatMoney, getPortfolioSnapshot, initialCashUsd } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/topluluk", page: "community" });
}

export default async function CommunityProfilePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nickname: true,
      displayNameMode: true,
      createdAt: true,
      leagueMemberships: {
        orderBy: { joinedAt: "desc" },
        include: { league: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const [snapshot, badges, tradeCount, tradeNoteCount] = await Promise.all([
    getPortfolioSnapshot(user.id),
    getBadgeDashboard(user.id),
    prisma.virtualTrade.count({ where: { userId: user.id } }),
    prisma.virtualTrade.count({ where: { userId: user.id, reason: { not: null } } }),
  ]);
  const displayName = getDisplayName(user);
  const earnedBadges = badges.filter((badge) => badge.earnedAt);
  const health = calculatePortfolioHealth({ snapshot, tradeCount, tradeNoteCount });
  const returnPercent = ((snapshot.totalValueUsd - initialCashUsd) / initialCashUsd) * 100;
  const isEnglish = locale === "en";

  return (
    <div className="community-profile-page grid gap-6">
      <section className="community-profile-hero premium-card p-6 md:p-8">
        <Link href={`/${locale}/topluluk`} className="text-sm font-black text-[#0f766e] hover:text-[#0b5f59]">
          {isEnglish ? "Back to community" : "Topluluğa dön"}
        </Link>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
              {isEnglish ? "Community profile" : "Topluluk profili"}
            </p>
            <h1 className="mt-2 text-4xl font-black text-[#152033] md:text-5xl">{displayName}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {isEnglish
                ? "This profile summarizes learning behavior, league participation, badges, and virtual portfolio discipline. It is for community learning, not investment advice."
                : "Bu profil; öğrenme davranışı, lig katılımı, rozetler ve sanal portföy disiplinini özetler. Amaç topluluk içinde öğrenmedir; yatırım tavsiyesi değildir."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {user.leagueMemberships.slice(0, 4).map((membership) => (
                <Link key={membership.id} href={`/${locale}/ligler/${membership.league.slug}`} className="rounded-full border border-[#d1bfa7]/50 bg-[#fffaf6] px-3 py-1.5 text-xs font-black text-[#8a6a5d]">
                  {membership.league.name}
                </Link>
              ))}
              {user.leagueMemberships.length === 0 ? (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500">
                  {isEnglish ? "No league yet" : "Henüz lig yok"}
                </span>
              ) : null}
            </div>
          </div>

          <aside className="rounded-2xl border border-[#0f766e]/25 bg-emerald-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">
              {isEnglish ? "Portfolio health" : "Portföy sağlığı"}
            </p>
            <p className="mt-2 text-5xl font-black text-[#0f766e]">{health.score}</p>
            <p className="mt-1 text-sm font-black text-[#152033]">{isEnglish ? health.riskLabelEn : health.riskLabelTr} · {health.grade}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${health.score}%` }} />
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProfileMetric label={isEnglish ? "Virtual portfolio" : "Sanal portföy"} value={formatMoney(snapshot.totalValueUsd)} />
        <ProfileMetric label={isEnglish ? "Return" : "Getiri"} value={`${returnPercent >= 0 ? "+" : ""}${returnPercent.toFixed(2)}%`} />
        <ProfileMetric label={isEnglish ? "Decision notes" : "Karar notu"} value={`${tradeNoteCount}/${tradeCount}`} />
        <ProfileMetric label={isEnglish ? "Badges" : "Rozet"} value={`${earnedBadges.length}/${badges.length}`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="premium-card p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
            {isEnglish ? "Portfolio composition" : "Portföy kompozisyonu"}
          </p>
          <div className="mt-4 grid gap-3">
            {snapshot.positions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm leading-6 text-slate-600">
                {isEnglish ? "No visible virtual positions yet." : "Henüz görünür sanal pozisyon yok."}
              </p>
            ) : (
              snapshot.positions.slice(0, 10).map((position) => {
                const weight = snapshot.totalValueUsd > 0 ? (position.valueUsd / snapshot.totalValueUsd) * 100 : 0;

                return (
                  <div key={position.id} className="rounded-2xl border border-slate-200 bg-white/75 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#152033]">{position.symbol}</p>
                        <p className="text-xs font-semibold text-slate-500">{position.name}</p>
                      </div>
                      <p className="text-sm font-black text-[#0f766e]">{weight.toFixed(1)}%</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${Math.min(100, Math.max(0, weight))}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">{formatMoney(position.valueUsd)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <aside className="premium-card p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
            {isEnglish ? "Badges and discipline" : "Rozetler ve disiplin"}
          </p>
          <div className="mt-4 grid gap-3">
            {badges.slice(0, 10).map((badge) => {
              const earned = Boolean(badge.earnedAt);

              return (
                <div key={badge.id} className={`rounded-2xl border p-4 ${earned ? "border-[#d1bfa7]/55 bg-[#fffaf6]" : "border-slate-200 bg-white/60 opacity-70"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{badge.icon}</span>
                    <div>
                      <p className="text-sm font-black text-[#152033]">{isEnglish ? badge.nameEn : badge.nameTr}</p>
                      <p className="text-xs font-semibold text-slate-500">{earned ? (isEnglish ? "Earned" : "Kazanıldı") : (isEnglish ? "Pending" : "Bekliyor")}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="premium-card p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a5d]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#152033]">{value}</p>
    </div>
  );
}
