import type { Metadata } from "next";
import { getDisplayName } from "@/lib/auth";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { getPortfolioSnapshot, formatMoney } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/liderlik-tablosu", page: "leaderboard" });
}

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).leaderboard;
  const users = await prisma.user.findMany({
    select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
  });
  const heldSymbols = await prisma.portfolioPosition.findMany({
    select: { symbol: true },
    distinct: ["symbol"],
  });
  const liveMarketItems = await getLiveMarketItemsForSymbols(heldSymbols.map((position) => position.symbol));
  const rows = await Promise.all(users.map(async (user) => {
    const snapshot = await getPortfolioSnapshot(user.id, liveMarketItems);
    return { id: user.id, displayName: getDisplayName(user), totalValueUsd: snapshot.totalValueUsd };
  }));
  const rankedRows = rows.sort((a, b) => b.totalValueUsd - a.totalValueUsd);

  return (
    <div className="grid gap-6">
      <section className="premium-card premium-card--interactive p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{locale === "en" ? "Competition ranking" : "Yarışma sıralaması"}</p>
        <h1 className="mt-2 text-3xl font-black text-[#152033]">{copy.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{copy.description}</p>
      </section>
      <section className="glass-card overflow-hidden rounded-lg shadow-sm">
        {rankedRows.map((row, index) => (
          <div key={row.id} className="grid gap-3 border-b border-white/60 p-5 transition hover:bg-white/45 md:grid-cols-[80px_1fr_180px] md:items-center">
            <p className="text-2xl font-black text-[#f5a623]">#{index + 1}</p>
            <p className="font-black text-[#152033]">{row.displayName}</p>
            <p className="font-black text-[#0f766e]">{formatMoney(row.totalValueUsd)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
