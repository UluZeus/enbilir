import Link from "next/link";
import { FormMessage } from "@/components/FormMessage";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  createLeagueAction,
  joinLeagueAction,
  logoutAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
  updateProfileDisplayAction,
} from "@/lib/actions";
import { getDisplayName, getSessionUser } from "@/lib/auth";
import { getBadgeDashboard } from "@/lib/badges";
import { getCompetitionRankingsForUser } from "@/lib/competition-periods";
import { getFriendDashboard } from "@/lib/friends";
import { getUserLeagues, leagueTypeLabels, leagueTypes } from "@/lib/leagues";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const dictionary = getDictionary(locale);
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="grid gap-6">
        <PageHeader title={dictionary.pages.panel.title} description={dictionary.pages.panel.description} />
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-xl font-black">Giriş gerekli</h2>
          <p className="mt-2 text-sm leading-6">Kullanıcı paneline erişmek için önce giriş yapmalısın.</p>
          <Link href={`/${locale}/giris`} className="premium-cta mt-5 inline-flex px-4 py-2 text-sm font-bold">
            Giriş sayfasına git
          </Link>
        </section>
      </div>
    );
  }

  const [friendDashboard, userLeagues, badges, competitionRankings] = await Promise.all([
    getFriendDashboard(user.id),
    getUserLeagues(user.id),
    getBadgeDashboard(user.id),
    getCompetitionRankingsForUser(user.id),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title={dictionary.pages.panel.title} description={dictionary.pages.panel.description} />
      <FormMessage message={query.error} />

      <section className="glass-card grid gap-4 rounded-lg p-6 shadow-sm md:grid-cols-3">
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Kullanıcı</p>
          <p className="mt-3 text-xl font-black text-[#152033]">{getDisplayName(user)}</p>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          <p className="mt-1 text-xs text-slate-500">Ad: {user.name}</p>
          <p className="mt-1 text-xs text-slate-500">Rumuz: {user.nickname ?? "Tanımlı değil"}</p>
        </div>
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Rol</p>
          <p className="mt-3 text-xl font-black text-[#0f766e]">{user.role}</p>
        </div>
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Oturum</p>
          <form action={logoutAction} className="mt-3">
            <input type="hidden" name="locale" value={locale} />
            <button className="premium-action px-4 py-2 text-sm font-bold">
              Çıkış yap
            </button>
          </form>
        </div>
      </section>

      <section className="glass-card rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#152033]">Görünen ad tercihi</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Liderlik ve sıralama alanlarında adınla mı, rumuzunla mı görüneceğini dilediğin zaman değiştirebilirsin.
        </p>
        <form action={updateProfileDisplayAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="userId" value={user.id} />
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Rumuz
            <input name="nickname" defaultValue={user.nickname ?? ""} className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Görünen ad
            <select name="displayNameMode" defaultValue={user.displayNameMode} className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]">
              <option value="REAL_NAME">Adımla görünsün</option>
              <option value="NICKNAME">Rumuzumla görünsün</option>
            </select>
          </label>
          <button className="premium-action px-5 py-3 text-sm font-black">Güncelle</button>
        </form>
      </section>

      <section className="glass-card rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">Yarışma dönemleri</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">Dönem derecelerim</h2>
          </div>
          <p className="text-sm text-slate-500">Snapshot yoksa anlık portföy değeriyle geçici hesaplanır.</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {competitionRankings.map((period) => (
            <div key={period.type} className="premium-card premium-card--interactive p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{period.label}</p>
              <p className="mt-2 text-2xl font-black text-[#0f766e]">#{period.overall}</p>
              <p className="mt-1 text-xs text-slate-500">{period.totalUsers} kullanıcı içinde</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">Lider: {period.leaderName}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-card premium-card--dark overflow-hidden shadow-sm">
        <div className="border-b border-white/10 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">Başarı sistemi</p>
          <h2 className="mt-2 text-2xl font-black">Rozetlerim</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Yarışmadaki davranışlarına göre rozet kazanırsın. Kazanılan rozetler altın, bekleyenler soluk görünür.
          </p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-5">
          {badges.map((badge) => {
            const earned = Boolean(badge.earnedAt);

            return (
              <div
                key={badge.id}
                className={`rounded-lg border p-4 ${
                  earned
                    ? "border-[#f5a623] bg-[#f5a623]/15 shadow-[0_0_24px_rgba(245,166,35,0.22)]"
                    : "border-white/10 bg-white/[0.04] opacity-55"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={earned ? "text-3xl text-[#f5a623]" : "text-3xl text-slate-500"}>{badge.icon}</span>
                  <span className="rounded-md bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                    {badge.category}
                  </span>
                </div>
                <h3 className={earned ? "mt-4 font-black text-white" : "mt-4 font-black text-slate-400"}>
                  {badge.nameTr}
                </h3>
                <p className={earned ? "mt-2 text-xs leading-5 text-slate-200" : "mt-2 text-xs leading-5 text-slate-500"}>
                  {badge.descriptionTr}
                </p>
                <p className={earned ? "mt-3 text-[11px] font-bold text-[#f5a623]" : "mt-3 text-[11px] font-bold text-slate-500"}>
                  {earned ? "Kazanıldı" : "Henüz kazanılmadı"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="premium-card premium-card--dark overflow-hidden shadow-sm">
        <div className="border-b border-white/10 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">Lig sistemi</p>
          <h2 className="mt-2 text-2xl font-black">Liglerim</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Rotary, Rotaract, Interact veya özel gruplar için lig oluştur; davet koduyla kendi yarışma çevreni kur.
          </p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">
          <form action={createLeagueAction} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <input type="hidden" name="locale" value={locale} />
            <h3 className="text-lg font-black text-white">Yeni lig oluştur</h3>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                Lig adı
                <input name="name" placeholder="Örn. Rotary İstanbul Portföy Ligi" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white outline-none focus:border-[#f5a623]" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                Lig türü
                <select name="type" defaultValue="ROTARY" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white outline-none focus:border-[#f5a623]">
                  {leagueTypes.map((type) => (
                    <option key={type} value={type}>{leagueTypeLabels[type]}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                Açıklama
                <textarea name="description" rows={4} placeholder="Lig amacı, katılım kapsamı veya kulüp notu" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white outline-none focus:border-[#f5a623]" />
              </label>
              <button className="premium-cta px-5 py-3 text-sm font-black">Lig oluştur</button>
            </div>
          </form>

          <div className="grid content-start gap-5">
            <form action={joinLeagueAction} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <input type="hidden" name="locale" value={locale} />
              <h3 className="text-lg font-black text-white">Davet kodu ile katıl</h3>
              <label className="mt-4 grid gap-2 text-sm font-bold text-slate-200">
                Davet kodu
                <input name="inviteCode" placeholder="Örn. A7K9P2XM" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal uppercase text-white outline-none focus:border-[#f5a623]" />
              </label>
              <button className="premium-link mt-4 w-full rounded-md px-5 py-3 text-sm font-black">Lige katıl</button>
            </form>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-white">Üye olduğun ligler</h3>
                <Link href={`/${locale}/ligler`} className="text-sm font-bold text-[#f5a623] hover:text-[#ffd36b]">Tüm ligler</Link>
              </div>
              <div className="mt-4 grid gap-3">
                {userLeagues.length === 0 ? (
                  <p className="rounded-md bg-black/25 p-4 text-sm text-slate-300">Henüz bir lige üye değilsin.</p>
                ) : (
                  userLeagues.map((membership) => (
                    <Link key={membership.id} href={`/${locale}/ligler/${membership.league.slug}`} className="rounded-md border border-white/10 bg-black/25 p-4 hover:border-[#f5a623]/70">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-white">{membership.league.name}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#f5a623]">{leagueTypeLabels[membership.league.type]}</p>
                          {membership.league.description ? <p className="mt-2 text-sm leading-6 text-slate-300">{membership.league.description}</p> : null}
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{membership.role}</p>
                          <p className="mt-1 text-sm font-black text-white">{membership.league._count.memberships} üye</p>
                          {membership.role === "OWNER" ? <p className="mt-1 text-xs text-slate-300">Kod: {membership.league.inviteCode}</p> : null}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card overflow-hidden rounded-lg shadow-sm">
        <div className="bg-[#101827] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">Sosyal yarışma</p>
          <h2 className="mt-2 text-2xl font-black">Arkadaşlarım</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            E-posta veya rumuz ile kullanıcı bulup arkadaşlık isteği gönder. Kabul edilen arkadaşlar ana sayfadaki arkadaşlar arası sıralamaya dahil edilir.
          </p>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="grid content-start gap-5">
            <form action={sendFriendRequestAction} className="rounded-lg border border-slate-200 bg-[#f8fafc] p-5">
              <input type="hidden" name="locale" value={locale} />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Kullanıcı ara
                <input name="query" placeholder="E-posta veya rumuz" className="rounded-md border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
              </label>
              <button className="premium-action mt-4 w-full px-5 py-3 text-sm font-black">Arkadaşlık isteği gönder</button>
            </form>
            <div className="rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#152033]">Giden istekler</h3>
              <div className="mt-4 grid gap-3">
                {friendDashboard.outgoingRequests.length === 0 ? <p className="text-sm text-slate-500">Bekleyen giden istek yok.</p> : friendDashboard.outgoingRequests.map((request) => (
                  <div key={request.id} className="rounded-md bg-[#f8fafc] p-4">
                    <p className="font-black text-[#152033]">{request.displayName}</p>
                    <p className="mt-1 text-xs text-slate-500">{request.user.email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid content-start gap-5">
            <div className="rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#152033]">Gelen istekler</h3>
              <div className="mt-4 grid gap-3">
                {friendDashboard.incomingRequests.length === 0 ? <p className="text-sm text-slate-500">Bekleyen gelen istek yok.</p> : friendDashboard.incomingRequests.map((request) => (
                  <div key={request.id} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black text-[#152033]">{request.displayName}</p>
                        <p className="mt-1 text-xs text-slate-500">{request.user.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <form action={respondFriendRequestAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="requestId" value={request.id} />
                          <button name="response" value="ACCEPTED" className="rounded-md bg-[#0f766e] px-3 py-2 text-xs font-black text-white">Kabul et</button>
                        </form>
                        <form action={respondFriendRequestAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="requestId" value={request.id} />
                          <button name="response" value="REJECTED" className="rounded-md border border-slate-300 px-3 py-2 text-xs font-black text-slate-700">Reddet</button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#152033]">Mevcut arkadaşlar</h3>
              <div className="mt-4 grid gap-3">
                {friendDashboard.friends.length === 0 ? <p className="text-sm text-slate-500">Henüz arkadaş eklemediniz.</p> : friendDashboard.friends.map((friend) => (
                  <div key={friend.id} className="rounded-md bg-[#101827] p-4 text-white">
                    <p className="font-black">{friend.displayName}</p>
                    <p className="mt-1 text-xs text-slate-300">{friend.user.email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
