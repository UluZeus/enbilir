import Link from "next/link";
import type { Metadata } from "next";
import { FormMessage } from "@/components/FormMessage";
import { LeagueInviteActions } from "@/components/leagues/LeagueInviteActions";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getUiCopy } from "@/i18n/ui-copy";
import {
  createLeagueAction,
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
import { getPortfolioSnapshot } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { getOnboardingProgress } from "@/lib/onboarding";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return {
    title: locale === "tr" ? "Kullanıcı Paneli | Enbilir" : "User Dashboard | Enbilir",
    robots: { index: false, follow: false },
  };
}

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
        leaguesBody: "Create a league for Rotary, Rotaract, Interact, or private groups; build your own competition community with direct participation.",
        createLeague: "Create new league",
        leagueName: "League name",
        leagueNamePlaceholder: "Example: Rotary Istanbul Portfolio League",
        leagueType: "League type",
        description: "Description",
        descriptionPlaceholder: "League purpose, participation scope, or club note",
        createLeagueButton: "Create league",
        joinByInvite: "Join from active leagues",
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
        leaguesBody: "Rotary, Rotaract, Interact veya özel gruplar için lig oluştur; doğrudan katılımla kendi yarışma çevreni kur.",
        createLeague: "Yeni lig oluştur",
        leagueName: "Lig adı",
        leagueNamePlaceholder: "Örn. Rotary İstanbul Portföy Ligi",
        leagueType: "Lig türü",
        description: "Açıklama",
        descriptionPlaceholder: "Lig amacı, katılım kapsamı veya kulüp notu",
        createLeagueButton: "Lig oluştur",
        joinByInvite: "Aktif liglerden katıl",
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
  searchParams?: Promise<{ error?: string; view?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const dictionary = getDictionary(locale);
  const ui = getUiCopy(locale);
  const copy = getPanelCopy(locale);
  const activeView = ["portfolio", "community", "settings"].includes(query.view ?? "") ? query.view! : "overview";
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
    onboardingProgress,
  ] = await Promise.all([
    activeView === "community" ? getFriendDashboard(user.id) : Promise.resolve({ friends: [] }),
    activeView === "overview" || activeView === "community" ? getUserLeagues(user.id) : Promise.resolve([]),
    activeView === "community" ? getBadgeDashboard(user.id) : Promise.resolve([]),
    activeView === "portfolio" ? getCompetitionRankingsForUser(user.id) : Promise.resolve([]),
    activeView === "overview" || activeView === "portfolio" ? prisma.virtualTrade.count({ where: { userId: user.id } }) : Promise.resolve(0),
    activeView === "overview" || activeView === "portfolio" ? prisma.virtualTrade.count({ where: { userId: user.id, reason: { not: null } } }) : Promise.resolve(0),
    activeView === "overview" ? prisma.aiMarketReportEvent.count({ where: { userId: user.id, eventType: "READ" } }) : Promise.resolve(0),
    activeView === "settings" ? prisma.user.findUnique({
      where: { id: user.id },
      select: { createdAt: true, membershipTier: true, vipPaidUntil: true },
    }) : Promise.resolve(null),
    activeView === "portfolio" ? prisma.virtualTrade.findMany({
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
    }) : Promise.resolve([]),
    activeView === "overview" || activeView === "portfolio" ? getPortfolioSnapshot(user.id) : Promise.resolve(null),
    getOnboardingProgress(user.id),
  ]);
  const membership = membershipUser ? getMembershipSnapshot(membershipUser) : null;
  const ownedLeague = userLeagues.find((membership) => membership.role === "OWNER");
  const earnedBadges = badges.filter((badge) => badge.earnedAt).length;
  const panelGrowthActions = getPanelGrowthActions(locale, Boolean(ownedLeague), userLeagues.length > 0);
  const inviteUrl = ownedLeague ? `${getSiteUrl()}/${locale}/ligler/${ownedLeague.league.slug}` : `${getSiteUrl()}/${locale}/ligler`;
  const portfolioHealth = calculatePortfolioHealth({
    snapshot: portfolioSnapshot,
    tradeCount,
    tradeNoteCount,
  });
  const todayActions = getTodayActions(locale, {
    hasTrade: tradeCount > 0,
    portfolioHealthScore: portfolioHealth.score,
    hasTradeNote: tradeNoteCount > 0,
    hasLeague: userLeagues.length > 0,
    hasReportRead: reportReadCount > 0,
    concentrationRatio: portfolioHealth.concentrationRatio,
  });
  const sortedPortfolioPositions = portfolioSnapshot
    ? [...portfolioSnapshot.positions].sort((a, b) => b.valueUsd - a.valueUsd)
    : [];
  const portfolioTotal = portfolioSnapshot?.totalValueUsd ?? 0;
  const cashAllocationPercent = portfolioTotal > 0
    ? ((portfolioSnapshot?.cashValueUsd ?? 0) / portfolioTotal) * 100
    : 0;
  const investedAllocationPercent = Math.max(0, 100 - cashAllocationPercent);

  return (
    <div className="growth-page grid gap-6">
      <PageHeader
        title={dictionary.pages.panel.title}
        description={locale === "tr" ? "Bugünkü önerilerini, portföyünü, liglerini ve hesap ayarlarını tek yerden yönet." : "Manage today's suggestions, your portfolio, leagues, and account settings in one place."}
        locale={locale}
      />
      <FormMessage message={query.error} />

      <nav className="sticky top-20 z-20 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur" aria-label={locale === "tr" ? "Panel bölümleri" : "Dashboard sections"}>
        {[
          ["overview", locale === "tr" ? "Genel bakış" : "Overview"],
          ["portfolio", locale === "tr" ? "Portföy" : "Portfolio"],
          ["community", locale === "tr" ? "Topluluk" : "Community"],
          ["settings", locale === "tr" ? "Hesap" : "Account"],
        ].map(([view, label]) => (
          <Link
            key={view}
            href={`/${locale}/panel?view=${view}`}
            aria-current={activeView === view ? "page" : undefined}
            style={activeView === view ? { color: "#fffaf6" } : undefined}
            className={`flex min-h-11 min-w-[9rem] flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${activeView === view ? "bg-[#101827] shadow-sm" : "text-slate-700 hover:bg-slate-100"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {activeView === "overview" ? <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-emerald-800">{locale === "tr" ? "Başlangıç ilerlemesi" : "Getting-started progress"}</p>
          <p className="mt-1 text-sm text-emerald-950">{onboardingProgress.completedCount}/{onboardingProgress.totalCount} · %{onboardingProgress.percent}</p>
        </div>
        <Link href={`/${locale}/baslangic`} className="mt-3 inline-flex rounded-md border border-emerald-700 px-4 py-2 text-sm font-black text-emerald-900 sm:mt-0">{locale === "tr" ? "Başlangıç yolunu aç" : "Open start path"}</Link>
      </section> : null}

      {membership && activeView === "settings" ? (
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

      <section className={`${activeView === "community" ? "block" : "hidden"} panel-growth-command rounded-[1.5rem] border border-white/10 p-5 text-white shadow-2xl`}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">
              {locale === "tr" ? "Büyüme merkezi" : "Growth center"}
            </p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">
              {locale === "tr" ? "Kulübünü lige çağır, öğrenme ritmini kur, ilerlemeyi görünür yap." : "Bring your club into the league, build a learning rhythm, and make progress visible."}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {locale === "tr"
                ? "Panel, yalnızca hesap ekranı değil; lig kurma, lig bağlantısı paylaşma, eğitim akışını başlatma ve AI raporlarla haftalık değerlendirme yapma merkezidir."
                : "The dashboard is not only an account page; it is where users create leagues, share league links, start the learning flow, and review AI reports weekly."}
            </p>
            {ownedLeague ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d1bfa7]">{locale === "tr" ? "Paylaşılacak lig bağlantısı" : "League link to share"}</p>
                <p className="mt-2 break-all text-sm font-black text-white">{inviteUrl}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{ownedLeague.league.name}</p>
                <div className="mt-3">
                  <LeagueInviteActions inviteUrl={inviteUrl} leagueName={ownedLeague.league.name} locale={locale} />
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

      <section className={`${activeView === "overview" ? "block" : "hidden"} panel-today-command premium-card p-6`}>
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
              {todayActions.map((action, index) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className={`rounded-2xl border p-4 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${
                    index === 0
                      ? "border-[#101827] bg-[#101827] text-white shadow-lg md:col-span-2 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-5 md:p-5"
                      : "border-[#d1bfa7]/40 bg-white/78 hover:border-[#0f766e]/45 hover:bg-white"
                  }`}
                >
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.14em] ${index === 0 ? "text-[#f5c96b]" : "text-[#0f766e]"}`}>{action.kicker}</p>
                    <h3 className={`mt-2 font-black ${index === 0 ? "text-lg text-white" : "text-base text-[#152033]"}`}>{action.title}</h3>
                    <p className={`mt-2 text-sm leading-6 ${index === 0 ? "text-slate-300" : "text-slate-600"}`}>{action.body}</p>
                  </div>
                  {index === 0 ? (
                    <span className="mt-4 inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white md:mt-0">
                      {locale === "tr" ? "Öncelikli adım →" : "Priority step →"}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>

          <aside className="portfolio-health-card rounded-2xl border border-[#0f766e]/25 bg-emerald-50 p-5">
            {tradeCount === 0 ? (
              <div>
                <p className="text-xs font-black uppercase text-[#0f766e]">{locale === "tr" ? "Portföy sağlık skoru" : "Portfolio health score"}</p>
                <h3 className="mt-2 text-xl font-black text-[#152033]">{locale === "tr" ? "İlk işlemden sonra hesaplanır" : "Calculated after your first trade"}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {locale === "tr" ? "Henüz yatırım pozisyonun olmadığı için portföyünü riskli veya kırılgan olarak puanlamıyoruz." : "You have no positions yet, so the portfolio is not labeled risky or fragile."}
                </p>
                <Link href={`/${locale}/islem-yap`} className="premium-cta mt-4 inline-flex px-4 py-2.5 text-sm font-black">
                  {locale === "tr" ? "İlk sanal işlemi planla" : "Plan your first virtual trade"}
                </Link>
              </div>
            ) : <>
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
            <div
              className="mt-4"
              role="progressbar"
              aria-label={locale === "tr" ? "Portföy sağlık skoru" : "Portfolio health score"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={portfolioHealth.score}
            >
              <div className="relative h-3 overflow-hidden rounded-full bg-white shadow-inner">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-rose-300/75" />
                <div className="absolute inset-y-0 left-1/3 w-1/3 bg-amber-300/75" />
                <div className="absolute inset-y-0 right-0 w-1/3 bg-emerald-500/75" />
                <span
                  className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#101827] shadow"
                  style={{ left: `${portfolioHealth.score}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1.5 grid grid-cols-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                <span>{locale === "tr" ? "Kırılgan" : "Fragile"}</span>
                <span className="text-center">{locale === "tr" ? "Dengeli" : "Balanced"}</span>
                <span className="text-right">{locale === "tr" ? "Güçlü" : "Strong"}</span>
              </div>
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
            </>}
          </aside>
        </div>
      </section>

      <section className={`${activeView === "portfolio" ? "block" : "hidden"} premium-card overflow-hidden`}>
        <div className="border-b border-slate-200/80 p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
                {locale === "tr" ? "Portföy görünümü" : "Portfolio overview"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#152033]">
                {locale === "tr" ? "Değer, nakit ve yoğunlaşmayı tek bakışta gör." : "See value, cash, and concentration at a glance."}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              {locale === "tr"
                ? "Kâr/zarar 1.000.000 USD performans bazı üzerinden hesaplanır; 100.000 USD ek işlem gücü getiriye dahil edilmez."
                : "Profit/loss uses the USD 1,000,000 performance base; the extra USD 100,000 trading power is excluded from returns."}
            </p>
          </div>
        </div>

        {portfolioSnapshot ? (
          <div className="grid gap-5 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PortfolioSummaryMetric
                label={locale === "tr" ? "Toplam değer" : "Total value"}
                value={formatDashboardMoney(portfolioSnapshot.totalValueUsd, locale)}
                note={locale === "tr" ? "Nakit + açık pozisyonlar" : "Cash + open positions"}
              />
              <PortfolioSummaryMetric
                label={locale === "tr" ? "Toplam kâr / zarar" : "Total profit / loss"}
                value={`${portfolioSnapshot.profitLossUsd >= 0 ? "+" : ""}${formatDashboardMoney(portfolioSnapshot.profitLossUsd, locale)}`}
                note={`${portfolioSnapshot.profitLossPercent >= 0 ? "+" : ""}${portfolioSnapshot.profitLossPercent.toFixed(2)}%`}
                tone={portfolioSnapshot.profitLossUsd >= 0 ? "positive" : "negative"}
              />
              <PortfolioSummaryMetric
                label={locale === "tr" ? "Kullanılabilir nakit" : "Available cash"}
                value={formatDashboardMoney(portfolioSnapshot.cashValueUsd, locale)}
                note={`${cashAllocationPercent.toFixed(1)}% · ${portfolioSnapshot.cashCurrency}`}
              />
              <PortfolioSummaryMetric
                label={locale === "tr" ? "Açık pozisyon" : "Open positions"}
                value={String(sortedPortfolioPositions.length)}
                note={formatDashboardMoney(portfolioSnapshot.positionsValueUsd, locale)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      {locale === "tr" ? "Varlık dağılımı" : "Asset allocation"}
                    </p>
                    <p className="mt-2 text-lg font-black text-[#152033]">
                      {locale === "tr" ? "Nakit / yatırım dengesi" : "Cash / invested balance"}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                    {sortedPortfolioPositions.length} {locale === "tr" ? "varlık" : "assets"}
                  </span>
                </div>
                <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${locale === "tr" ? "Nakit" : "Cash"} ${cashAllocationPercent.toFixed(1)}%, ${locale === "tr" ? "yatırım" : "invested"} ${investedAllocationPercent.toFixed(1)}%`}>
                  <span className="h-full bg-[#0f766e]" style={{ width: `${cashAllocationPercent}%` }} />
                  <span className="h-full bg-[#d9a441]" style={{ width: `${investedAllocationPercent}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
                  <div><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#0f766e]" />{locale === "tr" ? "Nakit" : "Cash"} · {cashAllocationPercent.toFixed(1)}%</div>
                  <div className="text-right"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#d9a441]" />{locale === "tr" ? "Yatırım" : "Invested"} · {investedAllocationPercent.toFixed(1)}%</div>
                </div>
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-4 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                    <span>{locale === "tr" ? "Başlangıç bazı" : "Starting base"}</span>
                    <span>{locale === "tr" ? "Bugün" : "Today"}</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <span className="font-black text-slate-600">{formatDashboardMoney(portfolioSnapshot.initialCapitalUsd, locale)}</span>
                    <span className={`text-lg font-black ${portfolioSnapshot.profitLossUsd >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatDashboardMoney(portfolioSnapshot.totalValueUsd, locale)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {locale === "tr" ? "Gün içi seri bulunmadığı için doğrulanmamış günlük değişim gösterilmez." : "Unverified daily change is not shown because an intraday series is unavailable."}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-black text-[#152033]">{locale === "tr" ? "Pozisyon dağılımı" : "Position breakdown"}</h3>
                </div>
                {sortedPortfolioPositions.length === 0 ? (
                  <p className="p-5 text-sm leading-6 text-slate-600">
                    {locale === "tr" ? "Henüz açık pozisyon yok. İlk sanal alımdan sonra dağılım burada görünecek." : "No open positions yet. Allocation will appear after the first virtual buy."}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sortedPortfolioPositions.slice(0, 8).map((position) => {
                      const weight = portfolioTotal > 0 ? (position.valueUsd / portfolioTotal) * 100 : 0;
                      const positionReturn = position.competitionCostUsd > 0 ? (position.profitLossUsd / position.competitionCostUsd) * 100 : 0;

                      return (
                        <div key={position.symbol} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_110px_110px] sm:items-center">
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-black text-[#152033]">{position.symbol}</p>
                              <span className="text-xs font-black text-slate-500 sm:hidden">{weight.toFixed(1)}%</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#d9a441]" style={{ width: `${Math.min(100, weight)}%` }} />
                            </div>
                          </div>
                          <p className="text-sm font-black text-[#152033] sm:text-right">{formatDashboardMoney(position.valueUsd, locale)}</p>
                          <p className={`text-sm font-black sm:text-right ${position.profitLossUsd >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {positionReturn >= 0 ? "+" : ""}{positionReturn.toFixed(2)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="p-6 text-sm leading-6 text-slate-600">
            {locale === "tr" ? "Portföy verisi şu anda alınamıyor. İşlem günlüğü korunmaya devam ediyor." : "Portfolio data is unavailable right now. Your trade journal remains intact."}
          </p>
        )}
      </section>

      <section className={`${activeView === "portfolio" ? "block" : "hidden"} panel-trade-journal premium-card p-6`}>
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

        {latestTrades.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm leading-6 text-slate-600">
            {locale === "tr"
              ? "Henüz işlem günlüğü oluşmadı. İlk sanal işlemini yaparken kısa bir gerekçe yazarsan bu alan karar defterine dönüşür."
              : "No trade journal yet. Add a short reason with your first virtual trade and this area becomes your decision log."}
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-3 lg:hidden">
              {latestTrades.map((trade) => (
                <article key={trade.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`w-fit rounded-full px-3 py-1 text-xs font-black ${trade.side === "BUY" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {trade.side === "BUY" ? (locale === "tr" ? "ALIM" : "BUY") : (locale === "tr" ? "SATIŞ" : "SELL")}
                      </p>
                      <p className="mt-3 text-lg font-black text-[#152033]">{trade.symbol}</p>
                      <p className="text-xs font-semibold text-slate-500">{trade.market}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#0f766e]">{formatDashboardMoney(trade.totalUsd, locale)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatDashboardMoney(trade.priceUsd, locale)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-black text-[#152033]">{trade.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{trade.reason ?? (locale === "tr" ? "Bu işlemde gerekçe notu yazılmamış." : "No decision note was written for this trade.")}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold text-slate-500">{new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(trade.createdAt)}</p>
                    <Link href={`/${locale}/islem-yap?symbol=${encodeURIComponent(trade.symbol)}&q=${encodeURIComponent(trade.symbol)}`} className="rounded-md border border-[#0f766e]/30 bg-emerald-50 px-3 py-2 text-xs font-black text-[#0f766e]">
                      {locale === "tr" ? "Tekrar incele" : "Review again"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block">
              <table className="w-full min-w-[920px] border-collapse text-left">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{locale === "tr" ? "İşlem" : "Trade"}</th>
                    <th className="px-4 py-3">{locale === "tr" ? "Varlık" : "Asset"}</th>
                    <th className="px-4 py-3">{locale === "tr" ? "Karar notu" : "Decision note"}</th>
                    <th className="px-4 py-3 text-right">{locale === "tr" ? "Fiyat" : "Price"}</th>
                    <th className="px-4 py-3 text-right">{locale === "tr" ? "Tutar" : "Amount"}</th>
                    <th className="px-4 py-3 text-right">{locale === "tr" ? "Tarih" : "Date"}</th>
                    <th className="px-4 py-3"><span className="sr-only">{locale === "tr" ? "Eylem" : "Action"}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestTrades.map((trade) => (
                    <tr key={trade.id} className="align-top transition hover:bg-slate-50">
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${trade.side === "BUY" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{trade.side === "BUY" ? (locale === "tr" ? "ALIM" : "BUY") : (locale === "tr" ? "SATIŞ" : "SELL")}</span></td>
                      <td className="px-4 py-4"><p className="font-black text-[#152033]">{trade.symbol}</p><p className="mt-1 text-xs font-semibold text-slate-500">{trade.name} · {trade.market}</p></td>
                      <td className="max-w-sm px-4 py-4 text-sm leading-6 text-slate-600">{trade.reason ?? (locale === "tr" ? "Gerekçe yazılmamış." : "No reason provided.")}</td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-slate-700">{formatDashboardMoney(trade.priceUsd, locale)}</td>
                      <td className="px-4 py-4 text-right text-sm font-black text-[#0f766e]">{formatDashboardMoney(trade.totalUsd, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold text-slate-500">{new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(trade.createdAt)}</td>
                      <td className="px-4 py-4 text-right"><Link href={`/${locale}/islem-yap?symbol=${encodeURIComponent(trade.symbol)}&q=${encodeURIComponent(trade.symbol)}`} className="inline-flex rounded-md border border-[#0f766e]/30 bg-emerald-50 px-3 py-2 text-xs font-black text-[#0f766e]">{locale === "tr" ? "İncele" : "Review"}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className={`${activeView === "settings" ? "grid" : "hidden"} glass-card gap-4 rounded-lg p-6 shadow-sm md:grid-cols-3`}>
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

      <section className={`${activeView === "settings" ? "block" : "hidden"} glass-card rounded-lg p-6 shadow-sm`}>
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

      <section className={`${activeView === "portfolio" ? "block" : "hidden"} glass-card rounded-lg p-6 shadow-sm`}>
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

      <section id="league-system" className={`${activeView === "community" ? "block" : "hidden"} premium-card premium-card--dark overflow-hidden shadow-sm`}>
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
                    {formatBadgeCategory(badge.category, locale)}
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

      <section className={`${activeView === "community" ? "block" : "hidden"} premium-card premium-card--dark overflow-hidden shadow-sm`}>
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
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-lg font-black text-white">{copy.joinByInvite}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {locale === "tr"
                  ? "Artık davet kodu gerekmez. Aktif ligleri açıp istediğin lige doğrudan katılabilirsin."
                  : "Invite codes are no longer required. Open active leagues and join the league you prefer directly."}
              </p>
              <Link href={`/${locale}/ligler`} className="premium-link mt-4 inline-flex w-full justify-center rounded-md px-5 py-3 text-sm font-black">
                {copy.joinLeague}
              </Link>
            </div>

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

      <section className={`${activeView === "community" ? "block" : "hidden"} glass-card overflow-hidden rounded-lg shadow-sm`}>
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

function PortfolioSummaryMetric({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const valueClass = tone === "positive"
    ? "text-emerald-700"
    : tone === "negative"
      ? "text-rose-700"
      : "text-[#152033]";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black sm:text-2xl ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{note}</p>
    </div>
  );
}

function formatDashboardMoney(value: number, locale: "tr" | "en") {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function PanelSoftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d1bfa7]/45 bg-white/70 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a5d]">{label}</p>
      <p className="mt-2 text-sm font-black text-[#152033]">{value}</p>
    </div>
  );
}

function getPanelGrowthActions(locale: "tr" | "en", hasOwnedLeague: boolean, hasLeague: boolean) {
  if (locale === "en") {
    return [
      {
        href: "/en/ligler",
        kicker: "League",
        title: hasLeague ? "Review your league" : "Join a league",
        body: hasLeague ? "Open league standings and compare the learning rhythm." : "Find an active league and join directly.",
      },
      {
        href: "/en/panel#league-system",
        kicker: "Share",
        title: hasOwnedLeague ? "Share your league link" : "Create a club league",
        body: hasOwnedLeague ? "Bring members in from the league link below." : "Start a focused space for your community.",
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
      body: hasLeague ? "Lig sıralamasını ve öğrenme ritmini aç." : "Aktif ligleri incele ve doğrudan katıl.",
    },
    {
      href: "/tr/panel#league-system",
      kicker: "Paylaş",
      title: hasOwnedLeague ? "Lig bağlantını paylaş" : "Kulüp ligi kur",
      body: hasOwnedLeague ? "Aşağıdaki bağlantıdan üyeleri lige çağır." : "Topluluğun için odaklı bir alan başlat.",
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

function formatBadgeCategory(category: string, locale: "tr" | "en") {
  if (locale !== "en") {
    return category;
  }

  const labels: Record<string, string> = {
    Başlangıç: "Start",
    Baslangic: "Start",
    Sosyal: "Social",
    Lig: "League",
    Liderlik: "Leadership",
    Strateji: "Strategy",
    Piyasa: "Market",
    Portföy: "Portfolio",
    Portfoy: "Portfolio",
    Öğrenme: "Learning",
    Ogrenme: "Learning",
  };

  return labels[category] ?? category;
}

function getTodayActions(
  locale: "tr" | "en",
  state: {
    hasTrade: boolean;
    portfolioHealthScore: number;
    hasTradeNote: boolean;
    hasLeague: boolean;
    hasReportRead: boolean;
    concentrationRatio: number;
  },
) {
  if (locale === "en") {
    return [
      !state.hasTrade
        ? {
            kicker: "First step",
            title: "Plan your first virtual trade",
            body: "Choose one asset, use a small amount, and write down the reason before submitting.",
            href: "/en/islem-yap",
          }
        : state.portfolioHealthScore < 66
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
      !state.hasTrade
        ? {
            kicker: "Preparation",
            title: "Review your next start step",
            body: "Use the saved start path when you are unsure what to do before trading.",
            href: "/en/baslangic",
          }
        : !state.hasTradeNote
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
    !state.hasTrade
      ? {
          kicker: "İlk adım",
          title: "İlk sanal işlemini planla",
          body: "Bir varlık seç, küçük bir tutar kullan ve uygulamadan önce karar gerekçeni yaz.",
          href: "/tr/islem-yap",
        }
      : state.portfolioHealthScore < 66
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
    !state.hasTrade
      ? {
          kicker: "Hazırlık",
          title: "Sıradaki başlangıç adımını gör",
          body: "İşlemden önce ne yapacağından emin değilsen kaydedilmiş başlangıç yolunu aç.",
          href: "/tr/baslangic",
        }
      : !state.hasTradeNote
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
