import { joinLeagueAction } from "@/lib/actions";
import type { Locale } from "@/i18n/config";

type LeagueRequiredGateProps = {
  locale: Locale;
  leagues: Array<{
    name: string;
    slug: string;
    id: string | null;
    description: string;
  }>;
};

export function LeagueRequiredGate({ locale, leagues }: LeagueRequiredGateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/62 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-3xl rounded-[1.25rem] border border-white/70 bg-white p-5 shadow-2xl sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {locale === "tr" ? "Lig seçimi gerekli" : "League selection required"}
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#152033]">
          {locale === "tr" ? "Devam etmek için bir lige katılmalısın." : "You need to join a league to continue."}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {locale === "tr"
            ? "Enbilir deneyimi lig ve liderlik akışıyla çalışır. Bir lig seçmen yeterli; istersen daha sonra diğer liglere de doğrudan katılabilirsin."
            : "The Enbilir experience runs through leagues and rankings. Choose one league now; you can join more leagues directly later."}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {leagues.map((league) => (
            <form key={league.slug} action={joinLeagueAction} className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="leagueSlug" value={league.slug} />
              <input type="hidden" name="redirectTo" value={`/${locale}/panel`} />
              <h3 className="text-lg font-black text-[#152033]">{league.name}</h3>
              <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{league.description}</p>
              <button className="premium-cta mt-auto px-4 py-2 text-sm font-black">
                {locale === "tr" ? "Bu ligi seç" : "Choose this league"}
              </button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
