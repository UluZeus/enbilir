import Link from "next/link";
import type { Metadata } from "next";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { joinLeagueAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { getDefaultLeagueDescription, getLeagueNameForLocale, isDefaultLeagueSlug } from "@/lib/default-leagues";
import { getActiveLeagues, getUserLeagues } from "@/lib/leagues";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/ligler", page: "leagues" });
}

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
  const totalMembers = activeLeagues.reduce((sum, league) => sum + league._count.memberships, 0);

  return (
    <div className="grid gap-5">
      <section className="league-growth-hero hero-visual p-5 text-white sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[#f5a623]">
              {locale === "tr" ? "Başlangıç adımı 1" : "Getting-started step 1"}
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black sm:text-4xl">
              {locale === "tr" ? "Öğrenme topluluğunu seç" : "Choose your learning community"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
              {locale === "tr"
                ? "Sana uygun bir lige katıl. Sonuçlarını benzer bir topluluk içinde karşılaştır; istersen daha sonra başka liglere de katılabilirsin."
                : "Join the league that fits you. Compare progress in a relevant community, and join other leagues later if you wish."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#aktif-ligler" className="premium-cta px-5 py-3 text-sm font-black">
                {locale === "tr" ? "Ligimi seç" : "Choose my league"}
              </a>
              {user ? (
                <Link href={`/${locale}/panel?view=community`} className="premium-link rounded-md px-5 py-3 text-sm font-black">
                  {locale === "tr" ? "Liglerimi yönet" : "Manage my leagues"}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <LeagueStat value={String(activeLeagues.length)} label={locale === "tr" ? "Açık lig" : "Open leagues"} />
            <LeagueStat value={String(totalMembers)} label={locale === "tr" ? "Üyelik" : "Memberships"} />
            <LeagueStat value={String(userLeagues.length)} label={locale === "tr" ? "Liglerin" : "Your leagues"} />
          </div>
        </div>
      </section>

      <section id="aktif-ligler" className="scroll-mt-28">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[#0f766e]">{locale === "tr" ? "Açık ligler" : "Open leagues"}</p>
            <h2 className="mt-1 text-2xl font-black text-[#152033]">{locale === "tr" ? "Bir lig seç ve devam et" : "Choose a league and continue"}</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {locale === "tr" ? "Özel ligler yalnızca davet koduyla açılır ve bu listede gösterilmez." : "Private leagues are available only by invitation code and do not appear here."}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeLeagues.length === 0 ? (
            <p className="premium-card p-6 text-sm text-slate-600">{copy.empty}</p>
          ) : activeLeagues.map((league) => {
            const leagueDescription = getLeagueDescriptionForLocale(league.slug, league.description, locale);
            const leagueName = getLeagueNameForLocale(league.name, league.slug, locale);
            const isMember = userLeagueIds.has(league.id);

            return (
              <article key={league.id} className="premium-card premium-card--interactive flex flex-col p-5 shadow-sm hover:border-[#f5a623]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-[#0f766e]">{copy.leagueTypeLabels[league.type]}</p>
                    <Link href={`/${locale}/ligler/${league.slug}`} className="mt-2 block text-xl font-black text-[#152033] hover:text-[#0f766e]">
                      {leagueName}
                    </Link>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-black ${isMember ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-cyan-200 bg-cyan-50 text-cyan-800"}`}>
                    {isMember ? copy.member : (locale === "tr" ? "Katılabilirsin" : "Open to join")}
                  </span>
                </div>
                {leagueDescription ? <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{leagueDescription}</p> : null}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-sm font-black text-slate-700">{copy.members(league._count.memberships)}</p>
                  {isMember ? (
                    <Link href={`/${locale}/ligler/${league.slug}`} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-black text-[#152033] hover:border-[#0f766e]">
                      {locale === "tr" ? "Ligi aç" : "Open league"}
                    </Link>
                  ) : user ? (
                    <form action={joinLeagueAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="leagueId" value={league.id} />
                      <input type="hidden" name="redirectTo" value={`/${locale}/baslangic`} />
                      <button className="premium-cta px-4 py-2 text-sm font-black">
                        {locale === "tr" ? "Bu lige katıl" : "Join this league"}
                      </button>
                    </form>
                  ) : (
                    <Link href={`/${locale}/giris`} className="premium-cta px-4 py-2 text-sm font-black">
                      {locale === "tr" ? "Giriş yap ve katıl" : "Sign in to join"}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <details className="premium-card group p-5 sm:p-6">
        <summary className="cursor-pointer list-none text-lg font-black text-[#152033]">
          <span className="flex items-center justify-between gap-4">
            {locale === "tr" ? "Hangi ligi seçmeliyim?" : "Which league should I choose?"}
            <span className="text-2xl text-[#0f766e] group-open:rotate-45" aria-hidden="true">+</span>
          </span>
        </summary>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {locale === "tr" ? "Lig yalnızca karşılaştırma topluluğunu belirler; sanal portföy bakiyeni veya işlem araçlarını değiştirmez." : "Your league only sets the comparison community; it does not change your virtual balance or trading tools."}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {getLeagueChoices(locale).map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-[#152033]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
        {user ? (
          <Link href={`/${locale}/panel?view=community#league-system`} className="mt-4 inline-flex text-sm font-black text-[#0f766e]">
            {locale === "tr" ? "Özel bir lig oluştur veya davet kodu kullan" : "Create a private league or use an invite code"}
          </Link>
        ) : null}
      </details>
    </div>
  );
}

function LeagueStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-center">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase text-[#d1bfa7]">{label}</p>
    </div>
  );
}

function getLeagueChoices(locale: "tr" | "en") {
  return locale === "en"
    ? [
        { title: "ROTARY", body: "For Rotary members who want to compare their learning practice within the Rotary community." },
        { title: "ROTARACT", body: "For Rotaract members and young professionals learning with their own community rhythm." },
        { title: "OPEN", body: "For everyone interested in financial literacy, without a club requirement." },
      ]
    : [
        { title: "ROTARYEN", body: "Öğrenme pratiğini Rotary topluluğu içinde karşılaştırmak isteyen Rotary üyeleri için." },
        { title: "ROTARACT", body: "Kendi topluluk ritmiyle öğrenmek isteyen Rotaract üyeleri ve genç profesyoneller için." },
        { title: "SERBEST", body: "Kulüp şartı olmadan finansal okuryazarlıkla ilgilenen herkes için." },
      ];
}

function getLeagueDescriptionForLocale(slug: string, description: string | null, locale: "tr" | "en") {
  if (locale === "tr") return description;
  if (isDefaultLeagueSlug(slug)) return getDefaultLeagueDescription(slug, "en");
  if (description && !looksTurkish(description)) return description;
  return "Community-created league. The league owner can add an English description from the dashboard.";
}

function looksTurkish(value: string) {
  return /[çğıöşüÇĞİÖŞÜ]|\b(ve|için|ile|kullanıcı|portföy|yarışma|finansal|okuryazarlık|lig|üyeler|katılım)\b/i.test(value);
}
