import type { DisplayNameMode } from "@/generated/prisma/enums";

export const publicCompetitionUserWhere = {
  isActive: true,
  emailVerifiedAt: { not: null },
} as const;

function normalizePrivateIdentifier(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

export function getSafePublicUserLabel(
  name: string,
  nickname: string | null,
  displayNameMode: DisplayNameMode,
  storedEmail?: string | null,
) {
  const selectedLabel = displayNameMode === "NICKNAME" ? nickname : name;
  const trimmedLabel = selectedLabel?.trim();

  if (!trimmedLabel || trimmedLabel.includes("@")) return null;

  if (storedEmail) {
    const normalizedLabel = normalizePrivateIdentifier(trimmedLabel);
    const normalizedEmail = normalizePrivateIdentifier(storedEmail);
    const normalizedLocalPart = normalizedEmail.split("@", 1)[0];

    if (normalizedLabel === normalizedEmail || normalizedLabel === normalizedLocalPart) {
      return null;
    }
  }

  return trimmedLabel;
}
