import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getIstanbulAiQueryWindow } from "@/lib/ai-query-policy";
import { prisma } from "@/lib/prisma";

const VOICE_PURPOSE = "VOICE_CHAT";
const RESERVATION_TTL_MS = 5 * 60 * 1000;
const MAX_TOKEN_LENGTH = 128;

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function isWellFormedToken(token: string) {
  return token.length >= 32 && token.length <= MAX_TOKEN_LENGTH && /^[A-Za-z0-9_-]+$/.test(token);
}

export async function createVoiceAiQueryReservation({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}) {
  const token = randomBytes(32).toString("base64url");
  const { dayKey } = getIstanbulAiQueryWindow(now);

  await prisma.aiQueryReservation.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      dayKey,
      purpose: VOICE_PURPOSE,
      expiresAt: new Date(now.getTime() + RESERVATION_TTL_MS),
    },
  });

  return token;
}

export async function consumeVoiceAiQueryReservation({
  token,
  userId,
  now = new Date(),
}: {
  token: string;
  userId: string;
  now?: Date;
}) {
  if (!isWellFormedToken(token)) {
    return false;
  }

  const consumed = await prisma.aiQueryReservation.updateMany({
    where: {
      tokenHash: hashToken(token),
      userId,
      purpose: VOICE_PURPOSE,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });

  return consumed.count === 1;
}
