import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redactOperationalText } from "@/lib/operations/redaction";

function toJsonMetadata(metadata?: Record<string, unknown>) {
  return metadata ? metadata as Prisma.InputJsonValue : undefined;
}

export async function markOperationalJobStarted(jobKey: string, metadata?: Record<string, unknown>) {
  const now = new Date();
  const jsonMetadata = toJsonMetadata(metadata);
  await prisma.operationalJobHeartbeat.upsert({
    where: { jobKey },
    create: {
      jobKey,
      lastStartedAt: now,
      metadata: jsonMetadata,
    },
    update: {
      lastStartedAt: now,
      metadata: jsonMetadata,
    },
  });
}

export async function markOperationalJobSucceeded(jobKey: string, metadata?: Record<string, unknown>) {
  const now = new Date();
  const jsonMetadata = toJsonMetadata(metadata);
  await prisma.operationalJobHeartbeat.upsert({
    where: { jobKey },
    create: {
      jobKey,
      lastStartedAt: now,
      lastSucceededAt: now,
      metadata: jsonMetadata,
    },
    update: {
      lastSucceededAt: now,
      lastError: null,
      metadata: jsonMetadata,
    },
  });
}

export async function markOperationalJobFailed(jobKey: string, error: unknown, metadata?: Record<string, unknown>) {
  const now = new Date();
  const jsonMetadata = toJsonMetadata(metadata);
  await prisma.operationalJobHeartbeat.upsert({
    where: { jobKey },
    create: {
      jobKey,
      lastStartedAt: now,
      lastFailedAt: now,
      lastError: redactOperationalText(error, 500),
      metadata: jsonMetadata,
    },
    update: {
      lastFailedAt: now,
      lastError: redactOperationalText(error, 500),
      metadata: jsonMetadata,
    },
  });
}
