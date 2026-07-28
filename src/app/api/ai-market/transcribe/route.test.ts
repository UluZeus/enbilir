import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createVoiceAiQueryReservation: vi.fn(),
  getAiQueryQuota: vi.fn(),
  getSessionUser: vi.fn(),
  reserveAiQuery: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
  },
}));
vi.mock("@/lib/membership", () => ({
  getMembershipSnapshot: () => ({ isPaidVipActive: false }),
}));
vi.mock("@/lib/ai-query-quota", () => ({
  DailyAiQueryLimitReachedError: class DailyAiQueryLimitReachedError extends Error {},
  getAiQueryQuota: mocks.getAiQueryQuota,
  reserveAiQuery: mocks.reserveAiQuery,
}));
vi.mock("@/lib/ai-query-reservation", () => ({
  createVoiceAiQueryReservation: mocks.createVoiceAiQueryReservation,
}));

import { POST } from "@/app/api/ai-market/transcribe/route";

function createAudioRequest() {
  const formData = new FormData();
  formData.set("locale", "tr");
  formData.set("audio", new File([Buffer.from([0x1a, 0x45, 0xdf, 0xa3])], "question.webm", { type: "audio/webm" }));

  return new Request("https://enbilir.test/api/ai-market/transcribe", {
    method: "POST",
    body: formData,
  });
}

describe("voice transcription authorization and quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    mocks.userFindUnique.mockResolvedValue({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      membershipTier: "STANDARD",
      vipPaidUntil: null,
    });
  });

  it("rejects anonymous requests before calling the transcription provider", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(createAudioRequest());

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects transcription when the shared daily AI quota is exhausted", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "user@example.test" });
    mocks.getAiQueryQuota.mockResolvedValue({
      used: 5,
      limit: 5,
      remaining: 0,
      isPaidVipActive: false,
      resetAt: new Date("2026-07-28T21:00:00.000Z"),
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(createAudioRequest());

    expect(response.status).toBe(429);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mocks.reserveAiQuery).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("reserves exactly one shared quota use and returns a one-time chat reservation", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "user@example.test" });
    mocks.getAiQueryQuota.mockResolvedValue({
      used: 0,
      limit: 5,
      remaining: 5,
      isPaidVipActive: false,
      resetAt: new Date("2026-07-28T21:00:00.000Z"),
    });
    mocks.reserveAiQuery.mockResolvedValue({
      used: 1,
      limit: 5,
      remaining: 4,
      isPaidVipActive: false,
      resetAt: new Date("2026-07-28T21:00:00.000Z"),
    });
    mocks.createVoiceAiQueryReservation.mockResolvedValue("voice-token");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ text: "Altın için risk nedir?" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));

    const response = await POST(createAudioRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.reserveAiQuery).toHaveBeenCalledTimes(1);
    expect(mocks.createVoiceAiQueryReservation).toHaveBeenCalledWith({ userId: "user-1" });
    expect(payload).toMatchObject({
      text: "Altın için risk nedir?",
      voiceReservation: "voice-token",
      quota: { used: 1, remaining: 4 },
    });
    fetchSpy.mockRestore();
  });

  it("counts a provider call as a costly query even when transcription fails", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "user-2", email: "user2@example.test" });
    mocks.getAiQueryQuota.mockResolvedValue({
      used: 0,
      limit: 5,
      remaining: 5,
      isPaidVipActive: false,
      resetAt: new Date("2026-07-28T21:00:00.000Z"),
    });
    mocks.reserveAiQuery.mockResolvedValue({
      used: 1,
      limit: 5,
      remaining: 4,
      isPaidVipActive: false,
      resetAt: new Date("2026-07-28T21:00:00.000Z"),
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: { message: "provider failed" } }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    ));

    const response = await POST(createAudioRequest());

    expect(response.status).toBe(502);
    expect(mocks.reserveAiQuery).toHaveBeenCalledTimes(1);
    expect(mocks.createVoiceAiQueryReservation).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
