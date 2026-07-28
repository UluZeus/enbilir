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
  const previous = await transaction.auditEvent.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { eventHash: true, createdAt: true },
  });
  const createdAt = previous && requestedAt <= previous.createdAt
    ? new Date(previous.createdAt.getTime() + 1)
    : requestedAt;
  const payload = input.payload ? canonicalize(input.payload) as Prisma.InputJsonValue : undefined;
  const eventHash = createHash("sha256").update(JSON.stringify(canonicalize({
    previousHash: previous?.eventHash ?? null,
    category: input.category,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    payload: payload ?? null,
    createdAt: createdAt.toISOString(),
  }))).digest("hex");

  return transaction.auditEvent.create({
    data: {
      category: input.category,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      payload,
      previousHash: previous?.eventHash ?? null,
      eventHash,
      createdAt,
    },
  });
}

export async function verifyAuditChain() {
  const events = await prisma.auditEvent.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
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

  return { valid: true, eventId: null, checked: events.length };
}
