import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LeagueInviteActions } from "@/components/leagues/LeagueInviteActions";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { joinLeagueAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { getDefaultLeagueDescription, getLeagueNameForLocale, isDefaultLeagueSlug } from "@/lib/default-leagues";
import { getLeagueDetail, getLeagueLeaderboard } from "@/lib/leagues";
import { formatMoney } from "@/lib/portfolio";
import { buildSeoDescription, defaultOpenGraphImage, stringifyJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = getSafeLocale(rawLocale);
  const league = await getLeagueDetail(slug);
  const leagueName = league ? getLeagueNameForLocale(league.name, slug, locale) : null;
  const leagueTitleName = leagueName && locale === "tr" && !leagueName.endsWith("Ligi") ? `${leagueName} Ligi` : leagueName;
  const title = league
    ? locale === "en"
      ? `${leagueName} | Enbilir Portfolio Competition`
      : `${leagueTitleName} | Enbilir Portföy Yarışması`
    : locale === "en"
      ? "League | Enbilir"
      : "Lig | Enbilir";
  const localizedDescription = getLeagueDescriptionForLocale(slug, league?.description ?? null, locale);
  const descriptionSource = localizedDescription || (locale === "en"
    ? "Join Enbilir leagues directly and follow virtual portfolio rankings with market-literacy context."
    : "Enbilir liglerine doğrudan katılın ve sanal portföy sıralamalarını finansal okuryazarlık bağlamıyla takip edin.");
  const description = buildSeoDescription(
    descriptionSource.length < 60
      ? `${descriptionSource} ${locale === "en" ? "Follow members, virtual portfolio rankings, and learning-focused competition inside Enbilir." : "Enbilir'de üyeleri, sanal portföy sıralamasını ve öğrenme odaklı yarışmayı takip edin."}`
      : descriptionSource,
  );
  const path = `/${locale}/ligler/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: {
        tr: `/tr/ligler/${slug}`,
        en: `/en/ligler/${slug}`,
      },
    },
    openGraph: {
      type: "website",
      url: path,
      title,
      description,
      siteName: "enbilir.com",
      images: [{ url: defaultOpenGraphImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultOpenGraphImage],
    },
  };
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).leagues;
  const user = await getSessionUser();
  const league = await getLeagueDetail(slug);

  if (!league || !league.isActive) {
    notFound();
  }

  const membership = user ? league.memberships.find((item) => item.userId === user.id) : null;
  const leaderboard = await getLeagueLeaderboard(league.id, user?.id);
  const leagueDescription = getLeagueDescriptionForLocale(league.slug, league.description, locale);
  const leagueName = getLeagueNameForLocale(league.name, league.slug, locale);
  const inviteUrl = `${getSiteUrl()}/${locale}/ligler/${league.slug}`;
  const siteUrl = getSiteUrl();
  const leagueUrl = `${siteUrl}/${locale}/ligler/${league.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: locale === "en" ? "Home" : "Ana sayfa",
            item: `${siteUrl}/${locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: locale === "en" ? "Leagues" : "Ligler",
            item: `${siteUrl}/${locale}/ligler`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: leagueName,
            item: leagueUrl,
          },
        ],
      },
      {
        "@type": "CollectionPage",
        name: locale === "en" ? leagueName : (leagueName.endsWith("Ligi") ? leagueName : `${leagueName} Ligi`),
        url: leagueUrl,
        description: leagueDescription ?? (locale === "en" ? "Enbilir virtual portfolio league." : "Enbilir sanal portföy ligi."),
        inLanguage: locale === "en" ? "en-US" : "tr-TR",
        isPartOf: {
          "@type": "WebSite",
          name: "Enbilir",
          url: siteUrl,
        },
      },
    ],
  };
  const sortedMemberships = [...league.memberships].sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
  const recentMembers = sortedMemberships.slice(0, 5);
  const ownerTasks = locale === "tr"
    ? ["Haftalık eğitim başlığını belirle", "Cuma günü ilk 5 portföyü değerlendir", "Yeni gelenlere lig sayfasını ve eğitim akışını hatırlat"]
    : ["Set the weekly learning topic", "Review the top 5 portfolios on Friday", "Remind new members of the league page and learning flow"];

  return (
    <div className="growth-page grid gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: stringifyJsonLd(structuredData) }} />
      <section className="league-detail-hero rounded-[1.6rem] border border-[#d9a441]/30 bg-[#101827] p-6 text-white shadow-sm">
        <Link href={`/${locale}/ligler`} className="text-sm font-bold text-[#f5a623] hover:text-[#ffd36b]">
          {copy.back}
        </Link>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">
              {copy.leagueTypeLabels[league.type]}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">{leagueName}</h1>
            {leagueDescription ? <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{leagueDescription}</p> : null}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{copy.memberCount}</p>
            <p className="mt-2 text-3xl font-black text-[#f5a623]">{league._count.memberships}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="premium-card p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
            {locale === "tr" ? "Kulüp büyüme akışı" : "Club growth flow"}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "Bu lig sadece sıralama değil; katılım, eğitim ve tekrar eden değerlendirme alanı." : "This league is more than ranking; it is a participation, learning, and recurring review space."}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(locale === "tr"
              ? ["Lig bağlantısını paylaş", "Haftalık eğitim notu belirle", "Cuma lig özetini tartış"]
              : ["Share the league link", "Set a weekly learning note", "Discuss the Friday league summary"]
            ).map((item, index) => (
              <div key={item} className="rounded-2xl border border-[#d1bfa7]/35 bg-[#fffaf6]/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a5d]">0{index + 1}</p>
                <p className="mt-2 text-sm font-black text-[#152033]">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="premium-card premium-card--dark p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5a623]">
            {membership?.role === "OWNER" ? locale === "tr" ? "Paylaşım" : "Sharing" : locale === "tr" ? "Katılım" : "Participation"}
          </p>
          {membership?.role === "OWNER" ? (
            <>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {locale === "tr"
                  ? "Bu lig doğrudan katılıma açıktır. İstersen bağlantıyı paylaşarak üyelerin bu sayfadan tek tıkla katılmasını sağlayabilirsin."
                  : "This league is open to direct joining. You can share the link so members can join from this page with one click."}
              </p>
              <p className="mt-3 rounded-lg border border-white/10 bg-white/6 p-3 text-xs leading-5 text-slate-300">{inviteUrl}</p>
              <div className="mt-3">
                <LeagueInviteActions inviteUrl={inviteUrl} leagueName={leagueName} locale={locale} />
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {membership
                  ? locale === "tr" ? "Bu ligin içindesin. Panelden portföyünü, rozetlerini ve liglerini birlikte takip edebilirsin." : "You are inside this league. Track your portfolio, badges, and leagues from the dashboard."
                  : locale === "tr" ? "Bu lige katılmak için davet kodu gerekmez. İstersen hemen katılıp lig sıralamasında yer alabilirsin." : "No invite code is required to join this league. You can join now and appear in the league ranking."}
              </p>
              {membership ? (
                <Link href={`/${locale}/panel`} className="premium-cta mt-4 inline-flex px-4 py-2 text-sm font-black">
                  {locale === "tr" ? "Panelime git" : "Go to my panel"}
                </Link>
              ) : (
                <form action={joinLeagueAction} className="mt-4">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="leagueId" value={league.id} />
                  <input type="hidden" name="redirectTo" value={`/${locale}/ligler/${league.slug}`} />
                  <button className="premium-cta px-4 py-2 text-sm font-black">
                    {locale === "tr" ? "Bu lige hemen katıl" : "Join this league now"}
                  </button>
                </form>
              )}
            </>
          )}
        </aside>
      </section>

      {membership?.role === "OWNER" ? (
        <section className="league-manager-panel premium-card premium-card--dark grid gap-5 p-6 lg:grid-cols-[1fr_1fr_1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5a623]">
              {locale === "tr" ? "Lig Yönetici Paneli" : "League Manager Panel"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">{leagueName}</h2>
            <p className="mt-3 break-all rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-white">
              {inviteUrl}
            </p>
            <div className="mt-3">
              <LeagueInviteActions inviteUrl={inviteUrl} leagueName={leagueName} locale={locale} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#d1bfa7]">
              {locale === "tr" ? "Üye listesi" : "Member list"}
            </h3>
            <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
              {sortedMemberships.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/6 p-3">
                  <p className="font-black text-white">{item.user.displayNameMode === "NICKNAME" && item.user.nickname ? item.user.nickname : item.user.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-300">{item.user.email}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#f5a623]">{item.role}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#d1bfa7]">
                {locale === "tr" ? "Son katılanlar" : "Recent members"}
              </h3>
              <div className="mt-3 grid gap-2">
                {recentMembers.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="font-black text-white">{item.user.displayNameMode === "NICKNAME" && item.user.nickname ? item.user.nickname : item.user.name}</p>
                    <p className="mt-1 text-xs text-slate-300">{new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", { dateStyle: "medium" }).format(item.joinedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#d1bfa7]">
                {locale === "tr" ? "Haftalık görevler" : "Weekly tasks"}
              </h3>
              <div className="mt-3 grid gap-2">
                {ownerTasks.map((task, index) => (
                  <p key={task} className="rounded-xl border border-white/10 bg-white/6 p-3 text-sm font-bold leading-6 text-slate-100">
                    {index + 1}. {task}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.status}</p>
          <p className="mt-2 text-xl font-black text-[#152033]">{membership ? membership.role : copy.notMember}</p>
        </div>
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.leagueRank}</p>
          <p className="mt-2 text-xl font-black text-[#0f766e]">
            {leaderboard.currentUserRank ? copy.rank(leaderboard.currentUserRank) : "-"}
          </p>
        </div>
        <div className="rounded-md bg-[#f8fafc] p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.participation}</p>
          {membership ? (
            <Link href={`/${locale}/panel`} className="mt-2 inline-flex rounded-md bg-[#101827] px-4 py-2 text-sm font-black text-white">
              {locale === "tr" ? "Panelime git" : "Go to my panel"}
            </Link>
          ) : (
            <form action={joinLeagueAction} className="mt-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="leagueId" value={league.id} />
              <input type="hidden" name="redirectTo" value={`/${locale}/ligler/${league.slug}`} />
              <button className="rounded-md bg-[#101827] px-4 py-2 text-sm font-black text-white">
                {locale === "tr" ? "Lige katıl" : "Join league"}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">{copy.innerLeaderboard}</p>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">{copy.ranking}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {leaderboard.rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">{copy.noMembers}</p>
          ) : (
            leaderboard.rows.map((row) => (
              <div key={row.membershipId} className="grid gap-3 p-5 md:grid-cols-[80px_1fr_160px_160px] md:items-center">
                <p className="text-2xl font-black text-[#f5a623]">#{row.rank}</p>
                <div>
                  <p className="font-black text-[#152033]">{row.displayName}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{row.role}</p>
                </div>
                <p className="font-black text-[#152033]">{formatMoney(row.totalValueUsd)}</p>
                <p className={row.profitLossUsd >= 0 ? "font-black text-[#0f766e]" : "font-black text-red-600"}>
                  {row.profitLossPercent.toFixed(2)}%
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function getLeagueDescriptionForLocale(slug: string, description: string | null, locale: "tr" | "en") {
  if (locale === "tr") {
    return description;
  }

  if (isDefaultLeagueSlug(slug)) {
    return getDefaultLeagueDescription(slug, "en");
  }

  if (description && !looksTurkish(description)) {
    return description;
  }

  return "Community-created league. The league owner can add an English description from the dashboard.";
}

function looksTurkish(value: string) {
  return /[çğıöşüÇĞİÖŞÜ]|\b(ve|için|ile|kullanıcı|portföy|yarışma|finansal|okuryazarlık|lig|üyeler|katılım)\b/i.test(value);
}
