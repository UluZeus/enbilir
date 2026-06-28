import type { LeagueType } from "@/generated/prisma/enums";
import { getUniqueInviteCode } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";

export type DefaultLeagueDefinition = {
  name: string;
  slug: string;
  type: LeagueType;
  inviteCode: string;
  descriptionTr: string;
  descriptionEn: string;
};

export const defaultLeagueDefinitions = [
  {
    name: "ROTARYEN",
    slug: "rotaryen",
    type: "ROTARY",
    inviteCode: "ROTARYEN",
    descriptionTr: "Rotaryen kullanıcılar için ana portföy yarışması ve finansal okuryazarlık ligi.",
    descriptionEn: "The main portfolio competition and financial-literacy league for Rotary members.",
  },
  {
    name: "ROTARACT",
    slug: "rotaract",
    type: "ROTARACT",
    inviteCode: "ROTARACT",
    descriptionTr: "Rotaract üyeleri ve genç profesyoneller için açık portföy yarışması ligi.",
    descriptionEn: "An open portfolio competition league for Rotaract members and young professionals.",
  },
  {
    name: "SERBEST",
    slug: "serbest",
    type: "GENERAL",
    inviteCode: "SERBEST",
    descriptionTr: "Rotary ve Rotaract dışından katılan tüm meraklı kullanıcılar için genel lig.",
    descriptionEn: "The general league for curious users joining from outside Rotary and Rotaract.",
  },
] as const satisfies readonly DefaultLeagueDefinition[];

export const defaultLeagueSlugs = defaultLeagueDefinitions.map((league) => league.slug);

export function isDefaultLeagueSlug(value: string) {
  return defaultLeagueSlugs.includes(value as (typeof defaultLeagueSlugs)[number]);
}

export function getDefaultLeagueDescription(slug: string, locale: "tr" | "en") {
  const definition = defaultLeagueDefinitions.find((league) => league.slug === slug);

  if (!definition) {
    return "";
  }

  return locale === "en" ? definition.descriptionEn : definition.descriptionTr;
}

async function getDefaultLeagueOwnerId(ownerUserId?: string) {
  if (ownerUserId) {
    return ownerUserId;
  }

  const owner = await prisma.user.findFirst({
    where: { role: { in: ["MASTER_ADMIN", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  }) ?? await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return owner?.id ?? null;
}

async function ensureDefaultLeague(definition: DefaultLeagueDefinition, ownerUserId: string) {
  const existing = await prisma.league.findUnique({
    where: { slug: definition.slug },
    select: { id: true },
  });

  const description = definition.descriptionTr;

  if (existing) {
    return prisma.league.update({
      where: { id: existing.id },
      data: {
        name: definition.name,
        description,
        type: definition.type,
        isActive: true,
      },
      select: { id: true, name: true, slug: true, description: true, type: true },
    });
  }

  const inviteConflict = await prisma.league.findUnique({
    where: { inviteCode: definition.inviteCode },
    select: { id: true },
  });
  const inviteCode = inviteConflict ? await getUniqueInviteCode() : definition.inviteCode;

  return prisma.league.create({
    data: {
      name: definition.name,
      slug: definition.slug,
      description,
      type: definition.type,
      inviteCode,
      createdByUserId: ownerUserId,
      isActive: true,
    },
    select: { id: true, name: true, slug: true, description: true, type: true },
  });
}

export async function ensureDefaultLeagues(options: { ownerUserId?: string; includeExistingUsersInRotaryen?: boolean } = {}) {
  const ownerUserId = await getDefaultLeagueOwnerId(options.ownerUserId);

  if (!ownerUserId) {
    return [];
  }

  const leagues = [];

  for (const definition of defaultLeagueDefinitions) {
    leagues.push(await ensureDefaultLeague(definition, ownerUserId));
  }

  if (options.includeExistingUsersInRotaryen) {
    const rotaryen = leagues.find((league) => league.slug === "rotaryen");

    if (rotaryen) {
      const users = await prisma.user.findMany({ select: { id: true } });

      for (const user of users) {
        await prisma.leagueMembership.upsert({
          where: {
            leagueId_userId: {
              leagueId: rotaryen.id,
              userId: user.id,
            },
          },
          create: {
            leagueId: rotaryen.id,
            userId: user.id,
            role: "MEMBER",
          },
          update: {},
        });
      }
    }
  }

  return leagues;
}

export async function getDefaultLeagueOptions(locale: "tr" | "en") {
  const ensuredLeagues = await ensureDefaultLeagues();
  const bySlug = new Map(ensuredLeagues.map((league) => [league.slug, league]));

  return defaultLeagueDefinitions.map((definition) => {
    const league = bySlug.get(definition.slug);

    return {
      id: league?.id ?? null,
      name: league?.name ?? definition.name,
      slug: definition.slug,
      type: league?.type ?? definition.type,
      description: locale === "en" ? definition.descriptionEn : definition.descriptionTr,
    };
  });
}
