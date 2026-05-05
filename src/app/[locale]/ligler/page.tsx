import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { getActiveLeagues, getUserLeagues, leagueTypeLabels } from "@/lib/leagues";

export default async function LeaguesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();
  const [activeLeagues, userLeagues] = await Promise.all([
    getActiveLeagues(),
    user ? getUserLeagues(user.id) : Promise.resolve([]),
  ]);
  const userLeagueIds = new Set(userLeagues.map((membership) => membership.leagueId));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Ligler"
        description="Rotary, Rotaract, Interact, özel grup ve genel liglerde sanal portföy yarışmasını kendi çevrenle yaşa."
      />

      <section className="hero-visual p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">Yarışma alanı</p>
            <h2 className="mt-2 text-2xl font-black">Kendi liginle rekabete gir</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Lig oluşturma ve davet koduyla katılma işlemleri kullanıcı panelinden yapılır.
            </p>
          </div>
          <Link href={`/${locale}/panel`} className="premium-cta px-5 py-3 text-sm font-black">
            Panelden yönet
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeLeagues.length === 0 ? (
          <p className="glass-card rounded-lg p-6 text-sm text-slate-600">
            Henüz aktif lig yok. İlk ligi panelden oluşturabilirsin.
          </p>
        ) : (
          activeLeagues.map((league) => (
            <Link
              key={league.id}
              href={`/${locale}/ligler/${league.slug}`}
              className="premium-card premium-card--interactive p-5 shadow-sm hover:border-[#f5a623]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
                    {leagueTypeLabels[league.type]}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#152033]">{league.name}</h3>
                </div>
                {userLeagueIds.has(league.id) ? (
                  <span className="rounded-md bg-[#101827] px-2 py-1 text-xs font-black text-[#f5a623]">Üyesin</span>
                ) : null}
              </div>
              {league.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{league.description}</p> : null}
              <p className="mt-4 text-sm font-black text-slate-700">{league._count.memberships} üye</p>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
