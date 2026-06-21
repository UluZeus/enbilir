import Link from "next/link";
import { FormMessage } from "@/components/FormMessage";
import { LeagueInviteActions } from "@/components/leagues/LeagueInviteActions";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getUiCopy } from "@/i18n/ui-copy";
import {
  createLeagueAction,
  joinLeagueAction,
  logoutAction,
  sendFriendRequestAction,
  updateProfileDisplayAction,
} from "@/lib/actions";
import { getDisplayName, getSessionUser } from "@/lib/auth";
import { getBadgeDashboard } from "@/lib/badges";
import { getCompetitionRankingsForUser } from "@/lib/competition-periods";
import { getFriendDashboard } from "@/lib/friends";
import { getUserLeagues, leagueTypes } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

function getPanelCopy(locale: "tr" | "en") {
  return locale === "en"
    ? {
        loginTitle: "Login required",
        loginBody: "Please sign in before accessing the user dashboard.",
        loginCta: "Go to login",
        user: "User",
        fullName: "Name",
        nickname: "Nickname",
        notSet: "Not set",
        role: "Role",
        session: "Session",
        logout: "Sign out",
        displayPreference: "Display name preference",
        displayPreferenceBody: "You can change whether rankings and leaderboard areas show your real name or nickname at any time.",
        displayName: "Display name",
        showRealName: "Show my real name",
        showNickname: "Show my nickname",
        update: "Update",
        competitionPeriods: "Competition periods",
        myPeriodRanks: "My period rankings",
        rankingLiveNote: "Live ranking is calculated with current portfolio value.",
        usersInside: "users",
        leader: "Leader",
        achievementSystem: "Achievement system",
        myBadges: "My badges",
        badgesBody: "You earn badges based on your behavior in the competition. Earned badges appear gold; pending badges appear muted.",
        earned: "Earned",
        notEarned: "Not earned yet",
        leagueSystem: "League system",
        myLeagues: "My leagues",
        leaguesBody: "Create a league for Rotary, Rotaract, Interact, or private groups; build your own competition community with an invite code.",
        createLeague: "Create new league",
        leagueName: "League name",
        leagueNamePlaceholder: "Example: Rotary Istanbul Portfolio League",
        leagueType: "League type",
        description: "Description",
        descriptionPlaceholder: "League purpose, participation scope, or club note",
        createLeagueButton: "Create league",
        joinByInvite: "Join with invite code",
        inviteCode: "Invite code",
        invitePlaceholder: "Example: A7K9P2XM",
        joinLeague: "Join league",
        joinedLeagues: "Your leagues",
        allLeagues: "All leagues",
        noLeagues: "You are not a member of any league yet.",
        members: "members",
        code: "Code",
        socialCompetition: "Social competition",
        myFriends: "My friends",
        friendsBody: "Find users by email or nickname and add them directly. Your friends are included in friend rankings on the home page.",
        searchUser: "Search user",
        emailOrNickname: "Email or nickname",
        addFriend: "Add friend",
        currentFriends: "Current friends",
        noFriends: "You have not added friends yet.",
      }
    : {
        loginTitle: "Giriş gerekli",
        loginBody: "Kullanıcı paneline erişmek için önce giriş yapmalısın.",
        loginCta: "Giriş sayfasına git",
        user: "Kullanıcı",
        fullName: "Ad",
        nickname: "Rumuz",
        notSet: "Tanımlı değil",
        role: "Rol",
        session: "Oturum",
        logout: "Çıkış yap",
        displayPreference: "Görünen ad tercihi",
        displayPreferenceBody: "Liderlik ve sıralama alanlarında adınla mı, rumuzunla mı görüneceğini dilediğin zaman değiştirebilirsin.",
        displayName: "Görünen ad",
        showRealName: "Adımla görünsün",
        showNickname: "Rumuzumla görünsün",
        update: "Güncelle",
        competitionPeriods: "Yarışma dönemleri",
        myPeriodRanks: "Dönem derecelerim",
        rankingLiveNote: "Anlık sıralama canlı portföy değeriyle hesaplanır.",
        usersInside: "kullanıcı içinde",
        leader: "Lider",
        achievementSystem: "Başarı sistemi",
        myBadges: "Rozetlerim",
        badgesBody: "Yarışmadaki davranışlarına göre rozet kazanırsın. Kazanılan rozetler altın, bekleyenler soluk görünür.",
        earned: "Kazanıldı",
        notEarned: "Henüz kazanılmadı",
        leagueSystem: "Lig sistemi",
        myLeagues: "Liglerim",
        leaguesBody: "Rotary, Rotaract, Interact veya özel gruplar için lig oluştur; davet koduyla kendi yarışma çevreni kur.",
        createLeague: "Yeni lig oluştur",
        leagueName: "Lig adı",
        leagueNamePlaceholder: "Örn. Rotary İstanbul Portföy Ligi",
        leagueType: "Lig türü",
        description: "Açıklama",
        descriptionPlaceholder: "Lig amacı, katılım kapsamı veya kulüp notu",
        createLeagueButton: "Lig oluştur",
        joinByInvite: "Davet kodu ile katıl",
        inviteCode: "Davet kodu",
        invitePlaceholder: "Örn. A7K9P2XM",
        joinLeague: "Lige katıl",
        joinedLeagues: "Üye olduğun ligler",
        allLeagues: "Tüm ligler",
        noLeagues: "Henüz bir lige üye değilsin.",
        members: "üye",
        code: "Kod",
        socialCompetition: "Sosyal yarışma",
        myFriends: "Arkadaşlarım",
        friendsBody: "E-posta veya rumuz ile kullanıcı bulup doğrudan arkadaş ekle. Arkadaşların ana sayfadaki arkadaşlar arası sıralamaya dahil edilir.",
        searchUser: "Kullanıcı ara",
        emailOrNickname: "E-posta veya rumuz",
        addFriend: "Arkadaş ekle",
        currentFriends: "Mevcut arkadaşlar",
        noFriends: "Henüz arkadaş eklemediniz.",
      };
}

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
  const ui = getUiCopy(locale);
  const copy = getPanelCopy(locale);
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="grid gap-6">
        <PageHeader title={dictionary.pages.panel.title} description={dictionary.pages.panel.description} locale={locale} />
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-xl font-black">{copy.loginTitle}</h2>
          <p className="mt-2 text-sm leading-6">{copy.loginBody}</p>
          <Link href={`/${locale}/giris`} className="premium-cta mt-5 inline-flex px-4 py-2 text-sm font-bold">
            {copy.loginCta}
          </Link>
        </section>
      </div>
    );
  }

  const [friendDashboard, userLeagues, badges, competitionRankings, tradeCount, reportReadCount] = await Promise.all([
    getFriendDashboard(user.id),
    getUserLeagues(user.id),
    getBadgeDashboard(user.id),
    getCompetitionRankingsForUser(user.id),
    prisma.virtualTrade.count({ where: { userId: user.id } }),
    prisma.aiMarketReportEvent.count({ where: { userId: user.id, eventType: "READ" } }),
  ]);
  const ownedLeague = userLeagues.find((membership) => membership.role === "OWNER");
  const earnedBadges = badges.filter((badge) => badge.earnedAt).length;
  const panelGrowthActions = getPanelGrowthActions(locale, Boolean(ownedLeague), userLeagues.length > 0);
  const inviteUrl = `${getSiteUrl()}/${locale}/panel`;
  const onboardingItems = getOnboardingChecklist(locale, {
    profileComplete: Boolean(user.name.trim() && (user.nickname?.trim() || user.displayNameMode === "REAL_NAME")),
    firstTradeComplete: tradeCount > 0,
    leagueJoined: userLeagues.length > 0,
    reportRead: reportReadCount > 0,
  });
  const onboardingComplete = onboardingItems.filter((item) => item.done).length;
  const onboardingPercent = Math.round((onboardingComplete / onboardingItems.length) * 100);

  return (
    <div className="growth-page grid gap-6">
      <PageHeader title={dictionary.pages.panel.title} description={dictionary.pages.panel.description} locale={locale} />
      <FormMessage message={query.error} />

      <section className="panel-growth-command rounded-[1.5rem] border border-white/10 p-5 text-white shadow-2xl">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">
              {locale === "tr" ? "Büyüme merkezi" : "Growth center"}
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              {locale === "tr" ? "Kulübünü davet et, öğrenme ritmini kur, ilerlemeyi görünür yap." : "Invite your club, build a learning rhythm, and make progress visible."}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {locale === "tr"
                ? "Panel, yalnızca hesap ekranı değil; lig kurma, davet kodu paylaşma, eğitim akışını başlatma ve AI raporlarla haftalık değerlendirme yapma merkezidir."
                : "The dashboard is not only an account page; it is where users create leagues, share invite codes, start the learning flow, and review AI reports weekly."}
            </p>
            {ownedLeague ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d1bfa7]">{locale === "tr" ? "Paylaşılacak davet kodu" : "Invite code to share"}</p>
                <p className="mt-2 text-2xl font-black tracking-[0.18em] text-white">{ownedLeague.league.inviteCode}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{ownedLeague.league.name}</p>
                <div className="mt-3">
                  <LeagueInviteActions inviteCode={ownedLeague.league.inviteCode} inviteUrl={inviteUrl} leagueName={ownedLeague.league.name} locale={locale} />
                </div>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <PanelMetric label={locale === "tr" ? "Lig üyeliği" : "League memberships"} value={String(userLeagues.length)} />
            <PanelMetric label={locale === "tr" ? "Rozet" : "Badges"} value={`${earnedBadges}/${badges.length}`} />
            <PanelMetric label={locale === "tr" ? "Arkadaş" : "Friends"} value={String(friendDashboard.friends.length)} />
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {panelGrowthActions.map((action) => (
            <Link key={action.href} href={action.href} className="panel-growth-action rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d1bfa7]">{action.kicker}</p>
              <h2 className="mt-2 text-base font-black text-white">{action.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{action.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel-onboarding-checklist premium-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
              {locale === "tr" ? "Başlangıç kontrol listesi" : "Onboarding checklist"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">
              {locale === "tr" ? "Platformu tam kullanmak için dört temel adım." : "Four essential steps to use the platform fully."}
            </h2>
          </div>
          <div className="rounded-2xl border border-[#d1bfa7]/45 bg-[#fffaf6] px-5 py-3 text-right">
            <p className="text-3xl font-black text-[#0f766e]">{onboardingPercent}%</p>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a5d]">
              {locale === "tr" ? "Tamamlandı" : "Complete"}
            </p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#eee5dc]">
          <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${onboardingPercent}%` }} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {onboardingItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`rounded-2xl border p-4 transition ${
                item.done
                  ? "border-[#0f766e]/30 bg-[#ecfdf5] text-[#152033]"
                  : "border-[#d1bfa7]/45 bg-white/75 text-[#152033] hover:border-[#bd8c7d]"
              }`}
            >
              <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                item.done ? "bg-[#0f766e] text-white" : "bg-[#bd8c7d]/16 text-[#8a6a5d]"
              }`}>
                {item.done ? (locale === "tr" ? "Tamamlandı" : "Done") : (locale === "tr" ? "Sırada" : "Next")}
              </span>
              <h3 className="mt-3 text-base font-black">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="glass-card grid gap-4 rounded-lg p-6 shadow-sm md:grid-cols-3">
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{copy.user}</p>
          <p className="mt-3 text-xl font-black text-[#152033]">{getDisplayName(user)}</p>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          <p className="mt-1 text-xs text-slate-500">{copy.fullName}: {user.name}</p>
          <p className="mt-1 text-xs text-slate-500">{copy.nickname}: {user.nickname ?? copy.notSet}</p>
        </div>
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{copy.role}</p>
          <p className="mt-3 text-xl font-black text-[#0f766e]">{user.role}</p>
        </div>
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{copy.session}</p>
          <form action={logoutAction} className="mt-3">
            <input type="hidden" name="locale" value={locale} />
            <button className="premium-action px-4 py-2 text-sm font-bold">
              {copy.logout}
            </button>
          </form>
        </div>
      </section>

      <section className="glass-card rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#152033]">{copy.displayPreference}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {copy.displayPreferenceBody}
        </p>
        <form action={updateProfileDisplayAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="userId" value={user.id} />
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            {copy.nickname}
            <input name="nickname" defaultValue={user.nickname ?? ""} className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            {copy.displayName}
            <select name="displayNameMode" defaultValue={user.displayNameMode} className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]">
              <option value="REAL_NAME">{copy.showRealName}</option>
              <option value="NICKNAME">{copy.showNickname}</option>
            </select>
          </label>
          <button className="premium-action px-5 py-3 text-sm font-black">{copy.update}</button>
        </form>
      </section>

      <section className="glass-card rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">{copy.competitionPeriods}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{copy.myPeriodRanks}</h2>
          </div>
          <p className="text-sm text-slate-500">{copy.rankingLiveNote}</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {competitionRankings.map((period) => (
            <div key={period.type} className="premium-card premium-card--interactive p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{period.label}</p>
              <p className="mt-2 text-2xl font-black text-[#0f766e]">#{period.overall}</p>
              <p className="mt-1 text-xs text-slate-500">{period.totalUsers} {copy.usersInside}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{copy.leader}: {period.leaderName}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="league-system" className="premium-card premium-card--dark overflow-hidden shadow-sm">
        <div className="border-b border-white/10 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{copy.achievementSystem}</p>
          <h2 className="mt-2 text-2xl font-black">{copy.myBadges}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {copy.badgesBody}
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
                  {locale === "en" ? badge.nameEn : badge.nameTr}
                </h3>
                <p className={earned ? "mt-2 text-xs leading-5 text-slate-200" : "mt-2 text-xs leading-5 text-slate-500"}>
                  {locale === "en" ? badge.descriptionEn : badge.descriptionTr}
                </p>
                <p className={earned ? "mt-3 text-[11px] font-bold text-[#f5a623]" : "mt-3 text-[11px] font-bold text-slate-500"}>
                  {earned ? copy.earned : copy.notEarned}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="premium-card premium-card--dark overflow-hidden shadow-sm">
        <div className="border-b border-white/10 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{copy.leagueSystem}</p>
          <h2 className="mt-2 text-2xl font-black">{copy.myLeagues}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {copy.leaguesBody}
          </p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">
          <form action={createLeagueAction} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <input type="hidden" name="locale" value={locale} />
            <h3 className="text-lg font-black text-white">{copy.createLeague}</h3>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                {copy.leagueName}
                <input name="name" placeholder={copy.leagueNamePlaceholder} className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white outline-none focus:border-[#f5a623]" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                {copy.leagueType}
                <select name="type" defaultValue="ROTARY" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white outline-none focus:border-[#f5a623]">
                  {leagueTypes.map((type) => (
                    <option key={type} value={type}>{ui.leagues.leagueTypeLabels[type]}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                {copy.description}
                <textarea name="description" rows={4} placeholder={copy.descriptionPlaceholder} className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white outline-none focus:border-[#f5a623]" />
              </label>
              <button className="premium-cta px-5 py-3 text-sm font-black">{copy.createLeagueButton}</button>
            </div>
          </form>

          <div className="grid content-start gap-5">
            <form action={joinLeagueAction} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <input type="hidden" name="locale" value={locale} />
              <h3 className="text-lg font-black text-white">{copy.joinByInvite}</h3>
              <label className="mt-4 grid gap-2 text-sm font-bold text-slate-200">
                {copy.inviteCode}
                <input name="inviteCode" placeholder={copy.invitePlaceholder} className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal uppercase text-white outline-none focus:border-[#f5a623]" />
              </label>
              <button className="premium-link mt-4 w-full rounded-md px-5 py-3 text-sm font-black">{copy.joinLeague}</button>
            </form>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-white">{copy.joinedLeagues}</h3>
                <Link href={`/${locale}/ligler`} className="text-sm font-bold text-[#f5a623] hover:text-[#ffd36b]">{copy.allLeagues}</Link>
              </div>
              <div className="mt-4 grid gap-3">
                {userLeagues.length === 0 ? (
                  <p className="rounded-md bg-black/25 p-4 text-sm text-slate-300">{copy.noLeagues}</p>
                ) : (
                  userLeagues.map((membership) => (
                    <Link key={membership.id} href={`/${locale}/ligler/${membership.league.slug}`} className="rounded-md border border-white/10 bg-black/25 p-4 hover:border-[#f5a623]/70">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-white">{membership.league.name}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#f5a623]">{ui.leagues.leagueTypeLabels[membership.league.type]}</p>
                          {membership.league.description ? <p className="mt-2 text-sm leading-6 text-slate-300">{membership.league.description}</p> : null}
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{membership.role}</p>
                          <p className="mt-1 text-sm font-black text-white">{membership.league._count.memberships} {copy.members}</p>
                          {membership.role === "OWNER" ? <p className="mt-1 text-xs text-slate-300">{copy.code}: {membership.league.inviteCode}</p> : null}
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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{copy.socialCompetition}</p>
          <h2 className="mt-2 text-2xl font-black">{copy.myFriends}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {copy.friendsBody}
          </p>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="grid content-start gap-5">
            <form action={sendFriendRequestAction} className="rounded-lg border border-slate-200 bg-[#f8fafc] p-5">
              <input type="hidden" name="locale" value={locale} />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                {copy.searchUser}
                <input name="query" placeholder={copy.emailOrNickname} className="rounded-md border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
              </label>
              <button className="premium-action mt-4 w-full px-5 py-3 text-sm font-black">{copy.addFriend}</button>
            </form>
          </div>

          <div className="grid content-start gap-5">
            <div className="rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#152033]">{copy.currentFriends}</h3>
              <div className="mt-4 grid gap-3">
                {friendDashboard.friends.length === 0 ? <p className="text-sm text-slate-500">{copy.noFriends}</p> : friendDashboard.friends.map((friend) => (
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

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#d1bfa7]">{label}</p>
    </div>
  );
}

function getOnboardingChecklist(
  locale: "tr" | "en",
  state: {
    profileComplete: boolean;
    firstTradeComplete: boolean;
    leagueJoined: boolean;
    reportRead: boolean;
  },
) {
  if (locale === "en") {
    return [
      {
        title: "Complete your profile",
        body: "Set how your name appears in rankings and community areas.",
        href: "/en/panel",
        done: state.profileComplete,
      },
      {
        title: "Make your first virtual trade",
        body: "Test a decision without real money and start building your portfolio history.",
        href: "/en/islem-yap",
        done: state.firstTradeComplete,
      },
      {
        title: "Join a league",
        body: "Use an invite code or create a club league to learn with others.",
        href: "/en/panel#league-system",
        done: state.leagueJoined,
      },
      {
        title: "Read your first macro report",
        body: "Use the AI macro report as a calmer daily market note.",
        href: "/en/ai-piyasa-asistani/raporlar",
        done: state.reportRead,
      },
    ];
  }

  return [
    {
      title: "Profilini tamamla",
      body: "Sıralama ve topluluk alanlarında nasıl görüneceğini belirle.",
      href: "/tr/panel",
      done: state.profileComplete,
    },
    {
      title: "İlk sanal işlemi yap",
      body: "Gerçek para riski olmadan bir karar dene ve portföy geçmişini başlat.",
      href: "/tr/islem-yap",
      done: state.firstTradeComplete,
    },
    {
      title: "Bir lige katıl",
      body: "Davet kodu kullan veya kulübün için özel bir lig oluştur.",
      href: "/tr/panel#league-system",
      done: state.leagueJoined,
    },
    {
      title: "İlk makro raporu oku",
      body: "AI makro raporu günlük piyasa değerlendirmesi için sakin bir not gibi kullan.",
      href: "/tr/ai-piyasa-asistani/raporlar",
      done: state.reportRead,
    },
  ];
}

function getPanelGrowthActions(locale: "tr" | "en", hasOwnedLeague: boolean, hasLeague: boolean) {
  if (locale === "en") {
    return [
      {
        href: "/en/ligler",
        kicker: "League",
        title: hasLeague ? "Review your league" : "Join a league",
        body: hasLeague ? "Open league standings and compare the learning rhythm." : "Use an invite code or find an active league.",
      },
      {
        href: "/en/panel#league-system",
        kicker: "Invite",
        title: hasOwnedLeague ? "Share your code" : "Create a club league",
        body: hasOwnedLeague ? "Bring members in from the code area below." : "Start a private space for your community.",
      },
      {
        href: "/en/egitim",
        kicker: "Learning",
        title: "Open the education flow",
        body: "Use the learning path before portfolio decisions.",
      },
      {
        href: "/en/ai-piyasa-asistani/raporlar",
        kicker: "AI report",
        title: "Read macro reports",
        body: "Use the 07:00, 12:00, and 18:00 reports as review anchors.",
      },
    ] as const;
  }

  return [
    {
      href: "/tr/ligler",
      kicker: "Lig",
      title: hasLeague ? "Ligini incele" : "Bir lige katıl",
      body: hasLeague ? "Lig sıralamasını ve öğrenme ritmini aç." : "Davet kodu kullan veya aktif ligleri incele.",
    },
    {
      href: "/tr/panel#league-system",
      kicker: "Davet",
      title: hasOwnedLeague ? "Kodunu paylaş" : "Kulüp ligi kur",
      body: hasOwnedLeague ? "Aşağıdaki kod alanından üyeleri davet et." : "Topluluğun için özel bir alan başlat.",
    },
    {
      href: "/tr/egitim",
      kicker: "Eğitim",
      title: "Eğitim akışını aç",
      body: "Portföy kararlarından önce öğrenme yolunu kullan.",
    },
    {
      href: "/tr/ai-piyasa-asistani/raporlar",
      kicker: "AI rapor",
      title: "Makro rapor oku",
      body: "07.00, 12.00 ve 18.00 raporlarını değerlendirme çıpası yap.",
    },
  ] as const;
}
