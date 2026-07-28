export const publicCompetitionUserWhere = {
  isActive: true,
  emailVerifiedAt: { not: null },
} as const;
