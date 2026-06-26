import Link from "next/link";
import type { Metadata } from "next";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getSessionUser } from "@/lib/auth";
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
  const ownedLeagueCount = userLeagues.filter((membership) => membership.role === "OWNER").length;
  const growthStats = [
    { value: String(activeLeagues.length), label: locale === "tr" ? "Aktif lig" : "Active leagues" },
    { value: String(totalMembers), label: locale === "tr" ? "Toplam üyelik" : "Total memberships" },
    { value: String(userLeagues.length), label: locale === "tr" ? "Senin liglerin" : "Your leagues" },
    { value: String(ownedLeagueCount), label: locale === "tr" ? "Yönettiğin lig" : "Managed by you" },
  ];

  return (
    <div className="growth-page grid gap-6">
      <section className="league-growth-hero hero-visual p-6 text-white">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{copy.heroEyebrow}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black md:text-5xl">{copy.heroTitle}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
              {copy.heroBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/${locale}/panel`} className="premium-cta px-5 py-3 text-sm font-black">
                {copy.managePanel}
              </Link>
              <Link href={`/${locale}/egitim`} className="premium-link rounded-md px-5 py-3 text-sm font-black">
                {locale === "tr" ? "Eğitim akışını gör" : "View learning flow"}
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {growthStats.map((stat) => (
              <div key={stat.label} className="growth-stat-card rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-3xl font-black text-white">{stat.value}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#d1bfa7]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="premium-card premium-card--interactive p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
            {locale === "tr" ? "Lig kurgusu" : "League flow"}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "Kendi kulübünle lig kur, arkadaşlarınla rekabet et, dönemsel yarışmalar düzenle." : "Create a league with your club, compete with friends, and run seasonal competitions."}
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
              <p className="text-sm font-black text-[#152033]">{locale === "tr" ? "1. Lig oluştur" : "1. Create a league"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{locale === "tr" ? "Rotary, Rotaract, Interact veya özel grup türü seç." : "Choose Rotary, Rotaract, Interact, or a private group type."}</p>
            </div>
            <div className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
              <p className="text-sm font-black text-[#152033]">{locale === "tr" ? "2. Davet kodu paylaş" : "2. Share invite code"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{locale === "tr" ? "Üyeleri güvenli biçimde içeri al ve kendi topluluk akışını kur." : "Bring members in securely and build your own community rhythm."}</p>
            </div>
            <div className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200/70">
              <p className="text-sm font-black text-[#152033]">{locale === "tr" ? "3. Dönemsel yarışma başlat" : "3. Run seasonal competition"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{locale === "tr" ? "Portföy değişimlerini, rozetleri ve liderliği görünür hale getir." : "Make portfolio changes, badges, and leadership visible."}</p>
            </div>
          </div>
        </div>
        <div className="league-invite-preview premium-card premium-card--dark p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5a623]">
            {locale === "tr" ? "Demo lig görünümü" : "Demo league view"}
          </p>
          <h3 className="mt-2 text-xl font-black">{locale === "tr" ? "Rotary İstanbul Portföy Ligi" : "Rotary Istanbul Portfolio League"}</h3>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <p className="text-sm font-black text-white">{locale === "tr" ? "24 üye" : "24 members"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{locale === "tr" ? "Haftalık liderlik, aylık görünüm ve davetli üyelik ile kontrollü yarışma alanı." : "A controlled competition area with weekly leadership, monthly visibility, and invite-only participation."}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <p className="text-sm font-black text-white">{locale === "tr" ? "Topluluk ritmi" : "Community rhythm"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{locale === "tr" ? "Pazartesi eğitim notu, Çarşamba mini ders, Cuma lig özeti, Pazar liderler." : "Monday literacy note, Wednesday mini lesson, Friday league summary, Sunday leaders."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="growth-loop-grid grid gap-4 md:grid-cols-4">
        {getLeagueGrowthLoop(locale).map((item) => (
          <div key={item.title} className="premium-card premium-card--interactive p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a5d]">{item.step}</p>
            <h2 className="mt-2 text-lg font-black text-[#152033]">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </div>
        ))}
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
                  <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-black uppercase text-emerald-700">
                    {copy.member}
                  </span>
                ) : (
                  <span className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-black uppercase text-red-700">
                    {copy.notMember}
                  </span>
                )}
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

function getLeagueGrowthLoop(locale: string) {
  if (locale === "en") {
    return [
      { step: "01", title: "Create the club league", body: "Give the community a private space with a clear purpose and league type." },
      { step: "02", title: "Share the invite code", body: "Bring members in through a simple code instead of manual onboarding." },
      { step: "03", title: "Run a weekly ritual", body: "Use education, portfolio review, and macro reports as repeatable anchors." },
      { step: "04", title: "Celebrate progress", body: "Rankings, badges, and league highlights make learning visible." },
    ] as const;
  }

  return [
    { step: "01", title: "Kulüp ligini kur", body: "Topluluğa net amaçlı, türü belli ve güvenli bir özel alan ver." },
    { step: "02", title: "Davet kodunu paylaş", body: "Üyeleri tek tek anlatmak yerine basit bir kodla içeri al." },
    { step: "03", title: "Haftalık ritim kur", body: "Eğitim, portföy değerlendirmesi ve makro raporu tekrar eden bağ yap." },
    { step: "04", title: "İlerlemeyi görünür kıl", body: "Sıralama, rozet ve lig özeti öğrenmeyi görünür hale getirir." },
  ] as const;
}
