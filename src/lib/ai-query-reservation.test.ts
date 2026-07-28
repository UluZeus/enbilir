import { beforeEach, describe, expect, it, vi } from "vitest";

const reservationMocks = vi.hoisted(() => ({
  create: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiQueryReservation: reservationMocks,
  },
}));

import {
  consumeVoiceAiQueryReservation,
  createVoiceAiQueryReservation,
} from "@/lib/ai-query-reservation";

describe("voice AI query reservations", () => {
  beforeEach(() => {
    reservationMocks.create.mockReset().mockResolvedValue({ id: "reservation" });
    reservationMocks.updateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("stores only a token hash and gives the credit a short lifetime", async () => {
    const now = new Date("2026-07-28T04:00:00.000Z");
    const token = await createVoiceAiQueryReservation({ userId: "user-1", now });
    const data = reservationMocks.create.mock.calls[0][0].data;

    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenHash).not.toBe(token);
    expect(data.userId).toBe("user-1");
    expect(data.purpose).toBe("VOICE_CHAT");
    expect(data.expiresAt.toISOString()).toBe("2026-07-28T04:05:00.000Z");
  });

  it("atomically consumes a valid user-bound credit only once", async () => {
    const token = "A".repeat(43);
    const now = new Date("2026-07-28T04:01:00.000Z");

    expect(await consumeVoiceAiQueryReservation({ token, userId: "user-1", now })).toBe(true);
    expect(reservationMocks.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        userId: "user-1",
        purpose: "VOICE_CHAT",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    reservationMocks.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await consumeVoiceAiQueryReservation({ token, userId: "user-1", now })).toBe(false);
  });

  it("rejects malformed tokens before reaching the database", async () => {
    expect(await consumeVoiceAiQueryReservation({
      token: "not valid",
      userId: "user-1",
    })).toBe(false);
    expect(reservationMocks.updateMany).not.toHaveBeenCalled();
  });
});
