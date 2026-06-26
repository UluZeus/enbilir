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
import { getMembershipLabel, getMembershipSnapshot, membershipConfig } from "@/lib/membership";
import { calculatePortfolioHealth } from "@/lib/portfolio-health";
import { formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";
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
        membership: "Membership",
        membershipBody: "Every account starts with 30 free days. Standard support is voluntary; VIP enables the higher-level AI market chat.",
        trial: "Free trial",
        trialEnds: "Trial ends",
        currentTier: "Current tier",
        standardSupport: "Standard support",
        vipUpgrade: "VIP upgrade",
        standardBody: "Standard AI chat stays limited to site live/cache market data.",
        vipBody: "VIP AI chat adds free public news/data headlines to the site data context.",
        standardPay: "Pay 70 TL voluntary support",
        vipPay: "Pay 100 TL VIP",
        vipUntil: "VIP paid until",
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
        membership: "Üyelik",
        membershipBody: "Her hesap 30 gün ücretsiz başlar. Standart katkı gönüllüdür; VIP daha üst seviye AI piyasa sohbetini açar.",
        trial: "Ücretsiz deneme",
        trialEnds: "Deneme bitişi",
        currentTier: "Güncel üyelik",
        standardSupport: "Standart destek",
        vipUpgrade: "VIP yükseltme",
        standardBody: "Standart AI sohbet sitedeki canlı/cache piyasa verileriyle sınırlı kalır.",
        vipBody: "VIP AI sohbet site verisine ek olarak ücretsiz public haber/veri başlıklarını bağlama dahil eder.",
        standardPay: "70 TL gönüllü katkı öde",
        vipPay: "100 TL VIP öde",
        vipUntil: "VIP bitiş tarihi",
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

  const [
    friendDashboard,
    userLeagues,
    badges,
    competitionRankings,
    tradeCount,
    tradeNoteCount,
    reportReadCount,
    membershipUser,
    latestTrades,
    portfolioSnapshot,
  ] = await Promise.all([
    getFriendDashboard(user.id),
    getUserLeagues(user.id),
    getBadgeDashboard(user.id),
    getCompetitionRankingsForUser(user.id),
    prisma.virtualTrade.count({ where: { userId: user.id } }),
    prisma.virtualTrade.count({ where: { userId: user.id, reason: { not: null } } }),
    prisma.aiMarketReportEvent.count({ where: { userId: user.id, eventType: "READ" } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { createdAt: true, membershipTier: true, vipPaidUntil: true },
    }),
    prisma.virtualTrade.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        symbol: true,
        name: true,
        market: true,
        side: true,
        priceUsd: true,
        totalUsd: true,
        reason: true,
        createdAt: true,
      },
    }),
    getPortfolioSnapshot(user.id),
  ]);
  const membership = membershipUser ? getMembershipSnapshot(membershipUser) : null;
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
  const learningScore = getLearningScore({
    profileComplete: onboardingItems[0]?.done ?? false,
    tradeCount,
    tradeNoteCount,
    leagueCount: userLeagues.length,
    reportReadCount,
    earnedBadges,
  });
  const learningMetrics = getLearningMetrics(locale, {
    learningScore,
    tradeCount,
    tradeNoteCount,
    reportReadCount,
    earnedBadges,
    totalBadges: badges.length,
    leagueCount: userLeagues.length,
  });
  const weeklyMissions = getWeeklyMissions(locale, {
    tradeNoteCount,
    reportReadCount,
    leagueCount: userLeagues.length,
    earnedBadges,
  });
  const portfolioHealth = calculatePortfolioHealth({
    snapshot: portfolioSnapshot,
    tradeCount,
    tradeNoteCount,
  });
  const todayActions = getTodayActions(locale, {
    portfolioHealthScore: portfolioHealth.score,
    hasTradeNote: tradeNoteCount > 0,
    hasLeague: userLeagues.length > 0,
    hasReportRead: reportReadCount > 0,
    concentrationRatio: portfolioHealth.concentrationRatio,
  });

  return (
    <div className="growth-page grid gap-6">
      <PageHeader title={dictionary.pages.panel.title} description={dictionary.pages.panel.description} locale={locale} />
      <FormMessage message={query.error} />

      {membership ? (
        <section className="premium-card grid gap-4 p-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">{copy.membership}</p>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">{getMembershipLabel(membership.effectiveTier, locale)}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy.membershipBody}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <PanelSoftMetric label={copy.currentTier} value={getMembershipLabel(membership.effectiveTier, locale)} />
              <PanelSoftMetric label={copy.trialEnds} value={new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium" }).format(membership.trialEndsAt)} />
              <PanelSoftMetric label={copy.vipUntil} value={membership.vipPaidUntil ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium" }).format(membership.vipPaidUntil) : "-"} />
            </div>
          </div>
          <div className="grid content-start gap-3">
            <div className="rounded-2xl border border-[#d1bfa7]/45 bg-[#fffaf6] p-4">
              <p className="font-black text-[#152033]">{copy.standardSupport}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy.standardBody}</p>
              <a href={membershipConfig.standardPaymentLink} target="_blank" rel="noreferrer" className="premium-action mt-3 inline-flex px-4 py-2 text-sm font-black">
                {copy.standardPay}
              </a>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-black text-[#152033]">{copy.vipUpgrade}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{copy.vipBody}</p>
              <a href={membershipConfig.vipPaymentLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                {copy.vipPay}
              </a>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel-growth-command rounded-[1.5rem] border border-white/10 p-5 text-white shadow-2xl">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">
              {locale === "tr" ? "Büyüme merkezi" : "Growth center"}
            </p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">
              {locale === "tr" ? "Kulübünü davet et, öğrenme ritmini kur, ilerlemeyi görünür yap." : "Invite your club, build a learning rhythm, and make progress visible."}
            </h2>
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

      <section className="panel-learning-command premium-card p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
              {locale === "tr" ? "Kişisel öğrenme paneli" : "Personal learning dashboard"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">
              {locale === "tr" ? "Okuma, işlem, rapor ve lig davranışını tek öğrenme skorunda gör." : "See reading, trading, reports, and league behavior in one learning score."}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
              {locale === "tr"
                ? "Bu alan portföy sonucundan önce karar alışkanlığını gösterir. Amaç sadece daha çok işlem yapmak değil; gerekçe yazmak, rapor okumak, lig ritmine katılmak ve davranışı zaman içinde daha bilinçli hale getirmektir."
                : "This area shows decision habits before portfolio outcome. The goal is not more trading alone; it is writing reasons, reading reports, joining league rhythm, and making behavior more deliberate over time."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {learningMetrics.map((metric) => (
                <PanelSoftMetric key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#0f766e]/25 bg-emerald-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">
              {locale === "tr" ? "Öğrenme skoru" : "Learning score"}
            </p>
            <p className="mt-2 text-5xl font-black text-[#0f766e]">{learningScore}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${learningScore}%` }} />
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
              {locale === "tr"
                ? "Skor; profil, işlem notu, rapor okuma, lig katılımı ve rozet davranışlarından hesaplanır."
                : "The score is calculated from profile, trade notes, report reads, league participation, and badges."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {weeklyMissions.map((mission) => (
            <Link
              key={mission.title}
              href={mission.href}
              className={`rounded-2xl border p-4 ${
                mission.done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[#d1bfa7]/45 bg-white/75 hover:border-[#bd8c7d]"
              }`}
            >
              <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                mission.done ? "bg-[#0f766e] text-white" : "bg-[#fffaf6] text-[#8a6a5d]"
              }`}>
                {mission.done ? (locale === "tr" ? "Tamamlandı" : "Done") : mission.kicker}
              </span>
              <h3 className="mt-3 text-base font-black text-[#152033]">{mission.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{mission.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel-today-command premium-card p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
              {locale === "tr" ? "Bugün ne yapmalıyım?" : "What should I do today?"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">
              {locale === "tr" ? "Günün akışı portföy sağlık skoruna ve öğrenme davranışına göre önerilir." : "Today's flow is suggested from portfolio health and learning behavior."}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
              {locale === "tr"
                ? "Bu alan yatırım tavsiyesi vermez; sadece platformu daha disiplinli kullanman için sıradaki öğrenme adımlarını gösterir."
                : "This area does not provide investment advice; it only shows the next learning steps for using the platform more deliberately."}
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {todayActions.map((action) => (
                <Link key={action.title} href={action.href} className="rounded-2xl border border-[#d1bfa7]/40 bg-white/78 p-4 hover:border-[#0f766e]/45">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">{action.kicker}</p>
                  <h3 className="mt-2 text-base font-black text-[#152033]">{action.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{action.body}</p>
                </Link>
              ))}
            </div>
          </div>

          <aside className="portfolio-health-card rounded-2xl border border-[#0f766e]/25 bg-emerald-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">
                  {locale === "tr" ? "Portföy sağlık skoru" : "Portfolio health score"}
                </p>
                <p className="mt-2 text-5xl font-black text-[#0f766e]">{portfolioHealth.score}</p>
              </div>
              <span className="rounded-full border border-[#0f766e]/25 bg-white px-3 py-1 text-sm font-black text-[#0f766e]">
                {portfolioHealth.grade}
              </span>
            </div>
            <p className="mt-2 text-sm font-black text-[#152033]">
              {locale === "tr" ? portfolioHealth.riskLabelTr : portfolioHealth.riskLabelEn}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${portfolioHealth.score}%` }} />
            </div>
            <div className="mt-4 grid gap-2 text-xs font-bold text-slate-700">
              <div className="flex justify-between gap-3">
                <span>{locale === "tr" ? "Nakit oranı" : "Cash ratio"}</span>
                <span>{Math.round(portfolioHealth.cashRatio * 100)}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>{locale === "tr" ? "En büyük varlık" : "Largest asset"}</span>
                <span>{Math.round(portfolioHealth.concentrationRatio * 100)}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>{locale === "tr" ? "Not oranı" : "Note ratio"}</span>
                <span>{Math.round(portfolioHealth.noteRatio * 100)}%</span>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {(locale === "tr" ? portfolioHealth.highlightsTr : portfolioHealth.highlightsEn).slice(0, 3).map((highlight) => (
                <p key={highlight} className="rounded-xl border border-emerald-200 bg-white/75 px-3 py-2 text-xs font-semibold leading-5 text-slate-700">
                  {highlight}
                </p>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="panel-trade-journal premium-card p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
              {locale === "tr" ? "Sanal işlem günlüğü" : "Virtual trade journal"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">
              {locale === "tr" ? "Son kararlarını gerekçeleriyle birlikte gözden geçir." : "Review recent decisions together with their notes."}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
              {locale === "tr"
                ? "Günlük alanı portföyün hafızasıdır. Kâr-zarardan bağımsız olarak, karar gerekçesi yazılmış işlemler daha sonra daha sağlıklı değerlendirilebilir."
                : "The journal is the portfolio's memory. Regardless of profit or loss, trades with decision notes are easier to review later."}
            </p>
          </div>
          <Link href={`/${locale}/islem-yap`} className="premium-action px-4 py-2 text-sm font-black">
            {locale === "tr" ? "Yeni işlem yaz" : "Add a new trade"}
          </Link>
        </div>

        <div className="mt-5 grid gap-3">
          {latestTrades.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm leading-6 text-slate-600">
              {locale === "tr"
                ? "Henüz işlem günlüğü oluşmadı. İlk sanal işlemini yaparken kısa bir gerekçe yazarsan bu alan karar defterine dönüşür."
                : "No trade journal yet. Add a short reason with your first virtual trade and this area becomes your decision log."}
            </p>
          ) : (
            latestTrades.map((trade) => (
              <article key={trade.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 lg:grid-cols-[160px_minmax(0,1fr)_160px] lg:items-start">
                <div>
                  <p className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                    trade.side === "BUY" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}>
                    {trade.side === "BUY" ? (locale === "tr" ? "ALIM" : "BUY") : (locale === "tr" ? "SATIŞ" : "SELL")}
                  </p>
                  <p className="mt-3 text-lg font-black text-[#152033]">{trade.symbol}</p>
                  <p className="text-xs font-semibold text-slate-500">{trade.market}</p>
                </div>
                <div className="min-w-0">
                  <p className="font-black text-[#152033]">{trade.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {trade.reason ?? (locale === "tr" ? "Bu işlemde gerekçe notu yazılmamış." : "No decision note was written for this trade.")}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(trade.createdAt)}
                  </p>
                </div>
                <div className="lg:text-right">
                  <p className="text-sm font-black text-[#0f766e]">{formatMoney(trade.totalUsd)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {locale === "tr" ? "Fiyat" : "Price"}: {formatMoney(trade.priceUsd)}
                  </p>
                  <Link href={`/${locale}/islem-yap?symbol=${encodeURIComponent(trade.symbol)}&q=${encodeURIComponent(trade.symbol)}`} className="mt-3 inline-flex rounded-md border border-[#0f766e]/30 bg-emerald-50 px-3 py-2 text-xs font-black text-[#0f766e]">
                    {locale === "tr" ? "Tekrar incele" : "Review again"}
                  </Link>
                </div>
              </article>
            ))
          )}
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

function PanelSoftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d1bfa7]/45 bg-white/70 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a5d]">{label}</p>
      <p className="mt-2 text-sm font-black text-[#152033]">{value}</p>
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

function getLearningScore({
  profileComplete,
  tradeCount,
  tradeNoteCount,
  leagueCount,
  reportReadCount,
  earnedBadges,
}: {
  profileComplete: boolean;
  tradeCount: number;
  tradeNoteCount: number;
  leagueCount: number;
  reportReadCount: number;
  earnedBadges: number;
}) {
  const score =
    (profileComplete ? 12 : 0) +
    Math.min(18, tradeCount * 6) +
    Math.min(22, tradeNoteCount * 8) +
    (leagueCount > 0 ? 16 : 0) +
    Math.min(18, reportReadCount * 6) +
    Math.min(14, earnedBadges * 3);

  return Math.max(0, Math.min(100, score));
}

function getLearningMetrics(
  locale: "tr" | "en",
  values: {
    learningScore: number;
    tradeCount: number;
    tradeNoteCount: number;
    reportReadCount: number;
    earnedBadges: number;
    totalBadges: number;
    leagueCount: number;
  },
) {
  if (locale === "en") {
    return [
      { label: "Learning score", value: `${values.learningScore}/100` },
      { label: "Journal notes", value: `${values.tradeNoteCount}/${values.tradeCount}` },
      { label: "Reports read", value: String(values.reportReadCount) },
      { label: "Badges", value: `${values.earnedBadges}/${values.totalBadges}` },
    ];
  }

  return [
    { label: "Öğrenme skoru", value: `${values.learningScore}/100` },
    { label: "Günlük notu", value: `${values.tradeNoteCount}/${values.tradeCount}` },
    { label: "Okunan rapor", value: String(values.reportReadCount) },
    { label: "Rozet", value: `${values.earnedBadges}/${values.totalBadges}` },
  ];
}

function getWeeklyMissions(
  locale: "tr" | "en",
  state: {
    tradeNoteCount: number;
    reportReadCount: number;
    leagueCount: number;
    earnedBadges: number;
  },
) {
  if (locale === "en") {
    return [
      {
        kicker: "Journal",
        title: "Write one decision note",
        body: "Before a virtual trade, record why you are doing it and what would prove you wrong.",
        href: "/en/islem-yap",
        done: state.tradeNoteCount > 0,
      },
      {
        kicker: "AI report",
        title: "Read one macro report",
        body: "Use a report as a calm market review before looking at the leaderboard.",
        href: "/en/ai-piyasa-asistani/raporlar",
        done: state.reportReadCount > 0,
      },
      {
        kicker: "League",
        title: "Join a community rhythm",
        body: "A league turns individual practice into shared learning.",
        href: "/en/ligler",
        done: state.leagueCount > 0,
      },
      {
        kicker: "Badge",
        title: "Earn a learning badge",
        body: "Badges reward behavior such as notes, diversification, and participation.",
        href: "/en/panel#league-system",
        done: state.earnedBadges > 1,
      },
    ];
  }

  return [
    {
      kicker: "Günlük",
      title: "Bir karar notu yaz",
      body: "Sanal işlemden önce nedenini ve yanıldığını hangi durumda kabul edeceğini kaydet.",
      href: "/tr/islem-yap",
      done: state.tradeNoteCount > 0,
    },
    {
      kicker: "AI rapor",
      title: "Bir makro rapor oku",
      body: "Liderliğe bakmadan önce raporu sakin piyasa değerlendirmesi gibi kullan.",
      href: "/tr/ai-piyasa-asistani/raporlar",
      done: state.reportReadCount > 0,
    },
    {
      kicker: "Lig",
      title: "Topluluk ritmine katıl",
      body: "Lig, bireysel pratiği ortak öğrenme ritmine dönüştürür.",
      href: "/tr/ligler",
      done: state.leagueCount > 0,
    },
    {
      kicker: "Rozet",
      title: "Öğrenme rozeti kazan",
      body: "Rozetler not yazma, çeşitlendirme ve katılım gibi davranışları görünür kılar.",
      href: "/tr/panel#league-system",
      done: state.earnedBadges > 1,
    },
  ];
}

function getTodayActions(
  locale: "tr" | "en",
  state: {
    portfolioHealthScore: number;
    hasTradeNote: boolean;
    hasLeague: boolean;
    hasReportRead: boolean;
    concentrationRatio: number;
  },
) {
  if (locale === "en") {
    return [
      state.portfolioHealthScore < 66
        ? {
            kicker: "Health",
            title: "Review portfolio balance",
            body: "Your health score suggests checking cash, diversification, and concentration before adding risk.",
            href: "/en/islem-yap",
          }
        : {
            kicker: "Health",
            title: "Keep the discipline",
            body: "Portfolio health is acceptable; review whether the current balance still matches your learning plan.",
            href: "/en/panel",
          },
      !state.hasTradeNote
        ? {
            kicker: "Journal",
            title: "Write your first decision reason",
            body: "A short note turns the next virtual trade into a reviewable learning moment.",
            href: "/en/islem-yap",
          }
        : {
            kicker: "Journal",
            title: "Re-read a past decision",
            body: "Open your journal and compare your original reason with what happened afterward.",
            href: "/en/panel",
          },
      !state.hasReportRead
        ? {
            kicker: "Macro",
            title: "Read today's macro report",
            body: "Use the report before looking at single-asset movement.",
            href: "/en/ai-piyasa-asistani/raporlar",
          }
        : {
            kicker: "AI",
            title: "Run a scenario question",
            body: "Ask what would invalidate one of your current views.",
            href: "/en/ai-piyasa-asistani",
          },
      !state.hasLeague
        ? {
            kicker: "Community",
            title: "Join a league",
            body: "A league adds rhythm and accountability to learning.",
            href: "/en/ligler",
          }
        : {
            kicker: "Concentration",
            title: state.concentrationRatio > 0.42 ? "Check single-asset weight" : "Compare with your league",
            body: state.concentrationRatio > 0.42 ? "One position may dominate the portfolio behavior." : "Use league rhythm to compare process, not only result.",
            href: state.concentrationRatio > 0.42 ? "/en/islem-yap" : "/en/ligler",
          },
    ];
  }

  return [
    state.portfolioHealthScore < 66
      ? {
          kicker: "Sağlık",
          title: "Portföy dengesini gözden geçir",
          body: "Sağlık skoru, yeni risk eklemeden önce nakit, çeşitlendirme ve yoğunlaşmayı kontrol etmeni öneriyor.",
          href: "/tr/islem-yap",
        }
      : {
          kicker: "Sağlık",
          title: "Disiplini koru",
          body: "Portföy sağlığı kabul edilebilir; mevcut dengenin öğrenme planınla uyumunu gözden geçir.",
          href: "/tr/panel",
        },
    !state.hasTradeNote
      ? {
          kicker: "Günlük",
          title: "İlk karar gerekçeni yaz",
          body: "Kısa bir not, sonraki sanal işlemi incelenebilir öğrenme anına dönüştürür.",
          href: "/tr/islem-yap",
        }
      : {
          kicker: "Günlük",
          title: "Geçmiş bir kararı yeniden oku",
          body: "İşlem günlüğünde ilk gerekçenle sonrasında olanları karşılaştır.",
          href: "/tr/panel",
        },
    !state.hasReportRead
      ? {
          kicker: "Makro",
          title: "Bugünkü makro raporu oku",
          body: "Tek varlık hareketine bakmadan önce raporu piyasa çerçevesi olarak kullan.",
          href: "/tr/ai-piyasa-asistani/raporlar",
        }
      : {
          kicker: "AI",
          title: "Bir senaryo sorusu çalıştır",
          body: "Mevcut görüşlerinden birini hangi şartta geçersiz sayacağını AI'a sor.",
          href: "/tr/ai-piyasa-asistani",
        },
    !state.hasLeague
      ? {
          kicker: "Topluluk",
          title: "Bir lige katıl",
          body: "Lig, öğrenmeye ritim ve sorumluluk duygusu ekler.",
          href: "/tr/ligler",
        }
      : {
          kicker: "Yoğunlaşma",
          title: state.concentrationRatio > 0.42 ? "Tek varlık ağırlığını kontrol et" : "Liginle karşılaştır",
          body: state.concentrationRatio > 0.42 ? "Bir pozisyon portföy davranışını fazla belirliyor olabilir." : "Lig ritmini sadece sonuç değil süreç karşılaştırması için kullan.",
          href: state.concentrationRatio > 0.42 ? "/tr/islem-yap" : "/tr/ligler",
        },
  ];
}
