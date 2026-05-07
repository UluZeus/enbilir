import Link from "next/link";
import { FormMessage } from "@/components/FormMessage";
import { PageHeader } from "@/components/PageHeader";
import { changeLeagueAction, removeCommunityFriendAction, sendCommunityFriendRequestAction } from "@/lib/actions";
import { getDisplayName, getSessionUser } from "@/lib/auth";
import { getFriendPairKey } from "@/lib/friends";
import { getSafeLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import type { FriendRequestStatus, LeagueType } from "@/generated/prisma/enums";

const categoryStyles: Record<UserCategory, string> = {
  Rotaryen: "bg-blue-50 text-blue-700 ring-blue-200",
  Rotaract: "bg-red-50 text-red-700 ring-red-200",
  Interact: "bg-orange-50 text-orange-700 ring-orange-200",
  "Diğer": "bg-slate-100 text-slate-700 ring-slate-200",
};

type UserCategory = "Rotaryen" | "Rotaract" | "Interact" | "Diğer";

type FriendshipState = {
  status: FriendRequestStatus;
  direction: "incoming" | "outgoing" | "mutual";
} | null;

function getCategory(type?: LeagueType): UserCategory {
  if (type === "ROTARY") {
    return "Rotaryen";
  }

  if (type === "ROTARACT") {
    return "Rotaract";
  }

  if (type === "INTERACT") {
    return "Interact";
  }

  return "Diğer";
}

function canChangeLeague(lastLeagueChangeAt: Date | null) {
  return !lastLeagueChangeAt || Date.now() - lastLeagueChangeAt.getTime() >= 30 * 86_400_000;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; error?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const search = String(query.q ?? "").trim().toLowerCase();
  const sessionUser = await getSessionUser();
  const [users, activeLeagues, friendships] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        nickname: true,
        displayNameMode: true,
        lastLeagueChangeAt: true,
        leagueMemberships: {
          orderBy: { joinedAt: "desc" },
          include: { league: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.league.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
    sessionUser
      ? prisma.friendRequest.findMany({
          where: {
            OR: [{ senderId: sessionUser.id }, { receiverId: sessionUser.id }],
          },
          select: { senderId: true, receiverId: true, status: true },
        })
      : Promise.resolve([]),
  ]);
  const friendshipMap = new Map(
    friendships.map((request) => [
      getFriendPairKey(request.senderId, request.receiverId),
      {
        status: request.status,
        direction:
          request.status === "ACCEPTED"
            ? "mutual"
            : request.senderId === sessionUser?.id
              ? "outgoing"
              : "incoming",
      } satisfies FriendshipState,
    ]),
  );
  const rows = users
    .map((user) => {
      const primaryMembership = user.leagueMemberships[0] ?? null;
      const leagueNames = user.leagueMemberships.map((membership) => membership.league.name);
      const category = getCategory(primaryMembership?.league.type);
      const displayName = getDisplayName(user);

      return {
        user,
        displayName,
        realName: user.name,
        primaryLeagueName: primaryMembership?.league.name ?? "Lig yok",
        primaryLeagueId: primaryMembership?.league.id ?? "",
        leagueNames,
        category,
        friendship: sessionUser ? friendshipMap.get(getFriendPairKey(sessionUser.id, user.id)) ?? null : null,
      };
    })
    .filter((row) => {
      if (!search) {
        return true;
      }

      return [row.displayName, row.realName, row.primaryLeagueName, row.category, ...row.leagueNames]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

  return (
    <div className="grid gap-6">
      <PageHeader title="Topluluk" description="Kullanıcıları, arkadaşlık durumunu ve lig üyeliklerini tek ekranda yönet." />
      <FormMessage message={query.error} />

      <section className="glass-card rounded-lg p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form className="grid gap-2 sm:min-w-[360px]">
            <label className="text-sm font-black text-[#152033]" htmlFor="community-search">
              Kullanıcı veya lig ara
            </label>
            <div className="flex gap-2">
              <input
                id="community-search"
                name="q"
                defaultValue={query.q ?? ""}
                placeholder="Ad, rumuz, lig veya kategori"
                className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white/80 px-4 py-3 text-sm outline-none focus:border-[#0f766e]"
              />
              <button className="premium-action px-4 py-3 text-sm font-black">Ara</button>
            </div>
          </form>
          <div className="grid gap-1 text-sm text-slate-600">
            <p className="font-bold text-[#152033]">{rows.length} kullanıcı listeleniyor</p>
            <p>Arkadaşlık ve lig değişimi işlemleri oturum gerektirir.</p>
          </div>
        </div>
      </section>

      {!sessionUser ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="font-black">Topluluk işlemleri için giriş gerekli.</p>
          <Link href={`/${locale}/giris`} className="premium-cta mt-4 inline-flex px-4 py-2 text-sm font-bold">
            Giriş yap
          </Link>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-white/70 bg-white/82 shadow-sm backdrop-blur-xl">
        <div className="hidden grid-cols-[1.25fr_1fr_150px_170px_260px] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 xl:grid">
          <span>Kullanıcı</span>
          <span>Lig</span>
          <span>Kategori</span>
          <span>Arkadaşlık</span>
          <span>İşlemler</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">Aramaya uygun kullanıcı bulunamadı.</p>
          ) : (
            rows.map((row) => (
              <CommunityRow
                key={row.user.id}
                locale={locale}
                row={row}
                sessionUserId={sessionUser?.id ?? null}
                activeLeagues={activeLeagues}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function CommunityRow({
  locale,
  row,
  sessionUserId,
  activeLeagues,
}: {
  locale: string;
  row: {
    user: {
      id: string;
      name: string;
      nickname: string | null;
      displayNameMode: "REAL_NAME" | "NICKNAME";
      lastLeagueChangeAt: Date | null;
    };
    displayName: string;
    realName: string;
    primaryLeagueName: string;
    primaryLeagueId: string;
    leagueNames: string[];
    category: UserCategory;
    friendship: FriendshipState;
  };
  sessionUserId: string | null;
  activeLeagues: { id: string; name: string; type: LeagueType }[];
}) {
  const isSelf = sessionUserId === row.user.id;
  const leagueChangeAllowed = canChangeLeague(row.user.lastLeagueChangeAt);

  return (
    <div className="grid gap-4 p-5 transition hover:bg-[#f8fafc] xl:grid-cols-[1.25fr_1fr_150px_170px_260px] xl:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#101827] text-sm font-black text-[#f5a623] shadow-sm">
          {initials(row.displayName)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-black text-[#152033]">{row.displayName}</p>
          <p className="mt-1 text-xs text-slate-500">
            {row.displayName === row.realName ? "Gerçek ad kayıtlı" : row.realName}
            {isSelf ? " · Sen" : ""}
          </p>
        </div>
      </div>
      <div>
        <p className="font-bold text-slate-700">{row.primaryLeagueName}</p>
        {row.leagueNames.length > 1 ? (
          <p className="mt-1 text-xs text-slate-500">+{row.leagueNames.length - 1} lig üyeliği</p>
        ) : null}
      </div>
      <div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset ${categoryStyles[row.category]}`}>
          {row.category}
        </span>
      </div>
      <FriendshipControl locale={locale} userId={row.user.id} isSelf={isSelf} friendship={row.friendship} disabled={!sessionUserId} />
      <LeagueControl
        locale={locale}
        userId={row.user.id}
        isSelf={isSelf}
        currentLeagueId={row.primaryLeagueId}
        activeLeagues={activeLeagues}
        leagueChangeAllowed={leagueChangeAllowed}
        disabled={!sessionUserId}
      />
    </div>
  );
}

function FriendshipControl({
  locale,
  userId,
  isSelf,
  friendship,
  disabled,
}: {
  locale: string;
  userId: string;
  isSelf: boolean;
  friendship: FriendshipState;
  disabled: boolean;
}) {
  if (isSelf) {
    return <span className="text-sm font-bold text-slate-500">Kendi hesabın</span>;
  }

  if (disabled) {
    return <span className="text-sm font-bold text-slate-500">Giriş gerekli</span>;
  }

  if (friendship?.status === "ACCEPTED") {
    return (
      <form action={removeCommunityFriendAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="targetUserId" value={userId} />
        <button className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100">
          Arkadaştan Çıkar
        </button>
      </form>
    );
  }

  if (friendship?.status === "PENDING") {
    return (
      <span className="inline-flex rounded-md bg-amber-50 px-3 py-2 text-sm font-black text-amber-700 ring-1 ring-inset ring-amber-200">
        {friendship.direction === "outgoing" ? "İstek Gönderildi" : "İstek Bekliyor"}
      </span>
    );
  }

  if (friendship?.status === "REJECTED") {
    return <span className="text-sm font-bold text-slate-500">Tekrar gönderilemez</span>;
  }

  return (
    <form action={sendCommunityFriendRequestAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="targetUserId" value={userId} />
      <button className="rounded-md bg-[#0f766e] px-3 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0b5f59]">
        Arkadaş Ekle
      </button>
    </form>
  );
}

function LeagueControl({
  locale,
  userId,
  isSelf,
  currentLeagueId,
  activeLeagues,
  leagueChangeAllowed,
  disabled,
}: {
  locale: string;
  userId: string;
  isSelf: boolean;
  currentLeagueId: string;
  activeLeagues: { id: string; name: string; type: LeagueType }[];
  leagueChangeAllowed: boolean;
  disabled: boolean;
}) {
  if (!isSelf) {
    return <span className="text-sm font-bold text-slate-500">Sadece kendi ligin</span>;
  }

  if (disabled) {
    return <span className="text-sm font-bold text-slate-500">Giriş gerekli</span>;
  }

  if (!leagueChangeAllowed) {
    return <span className="text-sm font-bold text-slate-500">Lig değişikliği ayda yalnızca 1 kez yapılabilir.</span>;
  }

  return (
    <form action={changeLeagueAction} className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <select
        name="leagueId"
        defaultValue={currentLeagueId || activeLeagues[0]?.id}
        disabled={activeLeagues.length === 0}
        className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-60"
      >
        {activeLeagues.map((league) => (
          <option key={league.id} value={league.id}>
            {league.name}
          </option>
        ))}
      </select>
      <button disabled={activeLeagues.length === 0} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-black text-[#152033] hover:border-[#0f766e] hover:text-[#0f766e] disabled:opacity-60">
        Lig Değiştir
      </button>
    </form>
  );
}
