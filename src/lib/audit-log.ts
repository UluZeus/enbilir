import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  category: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
  createdAt?: Date;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }

  return value;
}

export async function appendAuditEvent(
  transaction: Prisma.TransactionClient,
  input: AuditInput,
) {
  const requestedAt = input.createdAt ?? new Date();
  const head = await transaction.auditChainHead.upsert({
    where: { id: "global" },
    create: { id: "global", version: 1 },
    update: { version: { increment: 1 } },
    select: { lastEventHash: true, lastCreatedAt: true },
  });
  const legacyPrevious = head.lastEventHash === null
    ? await transaction.auditEvent.findFirst({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { eventHash: true, createdAt: true },
    })
    : null;
  const previousHash = head.lastEventHash ?? legacyPrevious?.eventHash ?? null;
  const previousCreatedAt = head.lastCreatedAt ?? legacyPrevious?.createdAt ?? null;
  const createdAt = previousCreatedAt && requestedAt <= previousCreatedAt
    ? new Date(previousCreatedAt.getTime() + 1)
    : requestedAt;
  const payload = input.payload ? canonicalize(input.payload) as Prisma.InputJsonValue : undefined;
  const eventHash = createHash("sha256").update(JSON.stringify(canonicalize({
    previousHash,
    category: input.category,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    payload: payload ?? null,
    createdAt: createdAt.toISOString(),
  }))).digest("hex");

  const event = await transaction.auditEvent.create({
    data: {
      category: input.category,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      payload,
      previousHash,
      eventHash,
      createdAt,
    },
  });
  await transaction.auditChainHead.update({
    where: { id: "global" },
    data: {
      lastEventHash: eventHash,
      lastCreatedAt: createdAt,
    },
  });
  return event;
}

export async function verifyAuditChain() {
  const [events, head] = await Promise.all([
    prisma.auditEvent.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.auditChainHead.findUnique({ where: { id: "global" } }),
  ]);
  let previousHash: string | null = null;

  for (const event of events) {
    const expectedHash: string = createHash("sha256").update(JSON.stringify(canonicalize({
      previousHash,
      category: event.category,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      actorUserId: event.actorUserId,
      payload: event.payload,
      createdAt: event.createdAt.toISOString(),
    }))).digest("hex");

    if (event.previousHash !== previousHash || event.eventHash !== expectedHash) {
      return { valid: false, eventId: event.id, checked: events.indexOf(event) + 1 };
    }
    previousHash = event.eventHash;
  }

  const lastEvent = events.at(-1) ?? null;
  if (head && (
    head.lastEventHash !== (lastEvent?.eventHash ?? null) ||
    head.lastCreatedAt?.getTime() !== lastEvent?.createdAt.getTime()
  )) {
    return { valid: false, eventId: lastEvent?.id ?? null, checked: events.length };
  }

  return { valid: true, eventId: null, checked: events.length };
}
