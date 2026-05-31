import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getSessionUser } from "@/lib/auth";
import { getActiveLeagues, getUserLeagues } from "@/lib/leagues";

export default async function LeaguesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).leagues;
  const user = await getSessionUser();
  const [activeLeagues, userLeagues] = await Promise.all([
    getActiveLeagues(),
    user ? getUserLeagues(user.id) : Promise.resolve([]),
  ]);
  const userLeagueIds = new Set(userLeagues.map((membership) => membership.leagueId));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        locale={locale}
      />

      <section className="hero-visual p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{copy.heroEyebrow}</p>
            <h2 className="mt-2 text-2xl font-black">{copy.heroTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {copy.heroBody}
            </p>
          </div>
          <Link href={`/${locale}/panel`} className="premium-cta px-5 py-3 text-sm font-black">
            {copy.managePanel}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeLeagues.length === 0 ? (
          <p className="glass-card rounded-lg p-6 text-sm text-slate-600">
            {copy.empty}
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
                    {copy.leagueTypeLabels[league.type]}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#152033]">{league.name}</h3>
                </div>
                {userLeagueIds.has(league.id) ? (
                  <span className="rounded-md bg-[#101827] px-2 py-1 text-xs font-black text-[#f5a623]">{copy.member}</span>
                ) : null}
              </div>
              {league.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{league.description}</p> : null}
              <p className="mt-4 text-sm font-black text-slate-700">{copy.members(league._count.memberships)}</p>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
