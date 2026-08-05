import { describe, expect, it, vi } from "vitest";

import { appendAuditEvent } from "@/lib/audit-log";

describe("audit chain serialization", () => {
  it("locks the singleton head before appending and advances it to the new event", async () => {
    const headUpsert = vi.fn().mockResolvedValue({
      id: "global",
      lastEventHash: "previous-hash",
      lastCreatedAt: new Date("2026-08-04T09:00:00.000Z"),
      version: 8,
    });
    const eventCreate = vi.fn().mockImplementation(async ({ data }) => ({ id: "event-2", ...data }));
    const headUpdate = vi.fn().mockResolvedValue({ id: "global" });
    const transaction = {
      auditChainHead: { upsert: headUpsert, update: headUpdate },
      auditEvent: { findFirst: vi.fn(), create: eventCreate },
    };

    const event = await appendAuditEvent(transaction as never, {
      category: "PORTFOLIO",
      entityType: "VirtualTrade",
      entityId: "trade-2",
      action: "BUY",
      createdAt: new Date("2026-08-04T08:59:59.000Z"),
    });

    expect(headUpsert).toHaveBeenCalledBefore(eventCreate);
    expect(event.previousHash).toBe("previous-hash");
    expect(event.createdAt.toISOString()).toBe("2026-08-04T09:00:00.001Z");
    expect(headUpdate).toHaveBeenCalledWith({
      where: { id: "global" },
      data: {
        lastEventHash: event.eventHash,
        lastCreatedAt: event.createdAt,
      },
    });
  });
});
