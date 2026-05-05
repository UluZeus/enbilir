import { prisma } from "@/lib/prisma";

export const defaultBadges = [
  {
    code: "FIRST_TRADE",
    nameTr: "İlk İşlem",
    nameEn: "First Trade",
    descriptionTr: "İlk sanal alım veya satım işlemini yaptın.",
    descriptionEn: "You completed your first virtual buy or sell trade.",
    icon: "↗",
    category: "Başlangıç",
  },
  {
    code: "FIRST_FRIEND",
    nameTr: "İlk Arkadaş",
    nameEn: "First Friend",
    descriptionTr: "İlk arkadaşlık bağlantını oluşturdun.",
    descriptionEn: "You made your first friend connection.",
    icon: "◆",
    category: "Sosyal",
  },
  {
    code: "FIRST_LEAGUE",
    nameTr: "İlk Lig",
    nameEn: "First League",
    descriptionTr: "İlk ligine katıldın veya kendi ligini oluşturdun.",
    descriptionEn: "You joined or created your first league.",
    icon: "♛",
    category: "Lig",
  },
  {
    code: "WEEKLY_LEADER",
    nameTr: "Haftalık Lider",
    nameEn: "Weekly Leader",
    descriptionTr: "Haftalık sıralamada liderlik başarısı için ayrıldı.",
    descriptionEn: "Reserved for weekly leaderboard leadership.",
    icon: "★",
    category: "Liderlik",
  },
  {
    code: "MONTHLY_LEADER",
    nameTr: "Aylık Lider",
    nameEn: "Monthly Leader",
    descriptionTr: "Aylık sıralamada liderlik başarısı için ayrıldı.",
    descriptionEn: "Reserved for monthly leaderboard leadership.",
    icon: "●",
    category: "Liderlik",
  },
  {
    code: "RISK_MASTER",
    nameTr: "Risk Ustası",
    nameEn: "Risk Master",
    descriptionTr: "Risk yönetimi kuralları için ayrıldı.",
    descriptionEn: "Reserved for risk management rules.",
    icon: "◇",
    category: "Strateji",
  },
  {
    code: "PATIENT_INVESTOR",
    nameTr: "Sabırlı Yatırımcı",
    nameEn: "Patient Investor",
    descriptionTr: "Uzun süreli pozisyon davranışı için ayrıldı.",
    descriptionEn: "Reserved for long-holding behavior.",
    icon: "◷",
    category: "Strateji",
  },
  {
    code: "GOLD_HUNTER",
    nameTr: "Altın Avcısı",
    nameEn: "Gold Hunter",
    descriptionTr: "Altın veya emtia odaklı başarılar için ayrıldı.",
    descriptionEn: "Reserved for gold or commodity achievements.",
    icon: "◈",
    category: "Piyasa",
  },
  {
    code: "CRYPTO_BRAVE",
    nameTr: "Kripto Cesuru",
    nameEn: "Crypto Brave",
    descriptionTr: "Kripto varlık işlemleri için ayrıldı.",
    descriptionEn: "Reserved for crypto asset activity.",
    icon: "⬡",
    category: "Piyasa",
  },
  {
    code: "PORTFOLIO_ARCHITECT",
    nameTr: "Portföy Mimarı",
    nameEn: "Portfolio Architect",
    descriptionTr: "En az 5 farklı varlığı aynı anda portföyünde tuttun.",
    descriptionEn: "You held at least 5 different assets at the same time.",
    icon: "▦",
    category: "Portföy",
  },
] as const;

export async function ensureDefaultBadges() {
  await Promise.all(
    defaultBadges.map((badge) =>
      prisma.badge.upsert({
        where: { code: badge.code },
        create: { ...badge, isActive: true },
        update: {
          nameTr: badge.nameTr,
          nameEn: badge.nameEn,
          descriptionTr: badge.descriptionTr,
          descriptionEn: badge.descriptionEn,
          icon: badge.icon,
          category: badge.category,
        },
      }),
    ),
  );
}

export async function awardBadge(userId: string, code: string, metadata?: Record<string, unknown>) {
  await ensureDefaultBadges();
  const badge = await prisma.badge.findUnique({
    where: { code },
    select: { id: true, isActive: true },
  });

  if (!badge?.isActive) {
    return null;
  }

  const userBadge = await prisma.userBadge.upsert({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id,
      },
    },
    create: {
      userId,
      badgeId: badge.id,
    },
    update: {},
  });

  await prisma.achievementEvent.create({
    data: {
      userId,
      type: code,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return userBadge;
}

export async function evaluateTradeBadges(userId: string) {
  await awardBadge(userId, "FIRST_TRADE");

  const positionCount = await prisma.portfolioPosition.count({
    where: {
      userId,
      quantity: { gt: 0 },
    },
  });

  if (positionCount >= 5) {
    await awardBadge(userId, "PORTFOLIO_ARCHITECT", { positionCount });
  }
}

export async function getBadgeDashboard(userId: string) {
  await ensureDefaultBadges();
  const badges = await prisma.badge.findMany({
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    include: {
      users: {
        where: { userId },
        select: { earnedAt: true },
      },
    },
  });

  return badges.map((badge) => ({
    id: badge.id,
    code: badge.code,
    nameTr: badge.nameTr,
    descriptionTr: badge.descriptionTr,
    icon: badge.icon,
    category: badge.category,
    isActive: badge.isActive,
    earnedAt: badge.users[0]?.earnedAt ?? null,
  }));
}
