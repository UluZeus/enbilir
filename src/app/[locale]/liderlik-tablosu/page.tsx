import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getDisplayName } from "@/lib/auth";
import { getLiveMarketItems } from "@/lib/live-market";
import { getPortfolioSnapshot, formatMoney } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  getSafeLocale(rawLocale);
  const users = await prisma.user.findMany({
    select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
  });
  const liveMarketItems = await getLiveMarketItems();
  const rows = await Promise.all(users.map(async (user) => {
    const snapshot = await getPortfolioSnapshot(user.id, liveMarketItems);
    return { id: user.id, displayName: getDisplayName(user), totalValueUsd: snapshot.totalValueUsd };
  }));
  const rankedRows = rows.sort((a, b) => b.totalValueUsd - a.totalValueUsd);

  return (
    <div className="grid gap-6">
      <PageHeader title="Liderlik tablosu" description="Genel sanal portföy yarışması sıralaması." />
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
