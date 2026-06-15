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
        <div className="premium-card premium-card--dark p-6">
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
