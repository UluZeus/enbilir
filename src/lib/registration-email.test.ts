import { describe, expect, it, vi } from "vitest";

import {
  hashRegistrationPassword,
  resendPendingRegistrationEmail,
} from "@/lib/registration-email";

const pendingUser = {
  id: "pending-user",
  name: "Synthetic Member",
  email: "member@example.test",
  isActive: false,
  emailVerifiedAt: null,
  emailVerificationTokenHash: "old-token-hash",
  emailVerificationExpiresAt: new Date("2026-07-28T12:00:00.000Z"),
  emailVerificationSentAt: new Date("2026-07-28T12:00:00.000Z"),
};

describe("pending registration verification resend", () => {
  it("performs one bcrypt-equivalent hash with a non-user dummy value for an existing account", async () => {
    const hash = vi.fn().mockResolvedValue("synthetic-hash");

    await expect(hashRegistrationPassword("submitted-private-password", true, hash))
      .resolves.toBe("synthetic-hash");

    expect(hash).toHaveBeenCalledOnce();
    expect(hash).not.toHaveBeenCalledWith("submitted-private-password", expect.anything());
  });

  it("hashes the submitted password for a new account", async () => {
    const hash = vi.fn().mockResolvedValue("synthetic-hash");

    await expect(hashRegistrationPassword("submitted-private-password", false, hash))
      .resolves.toBe("synthetic-hash");

    expect(hash).toHaveBeenCalledWith("submitted-private-password", 12);
  });

  it("does not mutate active or previously verified suspended accounts", async () => {
    const rotate = vi.fn();
    const rollback = vi.fn();
    const send = vi.fn();

    await expect(resendPendingRegistrationEmail({
      user: { ...pendingUser, isActive: true },
      locale: "tr",
      now: new Date("2026-07-29T12:00:00.000Z"),
      rotate,
      rollback,
      send,
    })).resolves.toEqual({ status: "not-pending" });

    await expect(resendPendingRegistrationEmail({
      user: { ...pendingUser, emailVerifiedAt: new Date("2026-07-27T12:00:00.000Z") },
      locale: "tr",
      now: new Date("2026-07-29T12:00:00.000Z"),
      rotate,
      rollback,
      send,
    })).resolves.toEqual({ status: "not-pending" });

    expect(rotate).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("honors the resend cooldown without rotating the token", async () => {
    const rotate = vi.fn();
    const send = vi.fn();

    await expect(resendPendingRegistrationEmail({
      user: {
        ...pendingUser,
        emailVerificationSentAt: new Date("2026-07-29T11:58:00.000Z"),
      },
      locale: "tr",
      now: new Date("2026-07-29T12:00:00.000Z"),
      rotate,
      rollback: vi.fn(),
      send,
    })).resolves.toEqual({ status: "cooldown" });

    expect(rotate).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("does not rotate a valid token when the durable target-email quota blocks the resend", async () => {
    const rotate = vi.fn();
    const rollback = vi.fn();
    const send = vi.fn();

    await expect(resendPendingRegistrationEmail({
      user: pendingUser,
      locale: "tr",
      now: new Date("2026-07-29T12:00:00.000Z"),
      targetAllowed: false,
      rotate,
      rollback,
      send,
    })).resolves.toEqual({ status: "target-limited" });

    expect(rotate).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("rotates with compare-and-set and sends a fresh verification message", async () => {
    const rotate = vi.fn().mockResolvedValue(true);
    const rollback = vi.fn();
    const send = vi.fn().mockResolvedValue(undefined);

    await expect(resendPendingRegistrationEmail({
      user: pendingUser,
      locale: "tr",
      now: new Date("2026-07-29T12:00:00.000Z"),
      rotate,
      rollback,
      send,
    })).resolves.toEqual({ status: "sent" });

    expect(rotate).toHaveBeenCalledOnce();
    expect(rotate.mock.calls[0]?.[0]).toMatchObject({
      userId: pendingUser.id,
      expectedTokenHash: pendingUser.emailVerificationTokenHash,
      sentAt: new Date("2026-07-29T12:00:00.000Z"),
    });
    expect(rotate.mock.calls[0]?.[0].tokenHash).not.toBe(pendingUser.emailVerificationTokenHash);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toMatchObject({ to: pendingUser.email });
    expect(send.mock.calls[0]?.[0].text).not.toContain(pendingUser.emailVerificationTokenHash);
    expect(rollback).not.toHaveBeenCalled();
  });

  it("restores the previous token state if delivery fails", async () => {
    const rotate = vi.fn().mockResolvedValue(true);
    const rollback = vi.fn().mockResolvedValue(true);
    const send = vi.fn().mockRejectedValue(new Error("provider private detail"));

    await expect(resendPendingRegistrationEmail({
      user: pendingUser,
      locale: "tr",
      now: new Date("2026-07-29T12:00:00.000Z"),
      rotate,
      rollback,
      send,
    })).rejects.toThrow("Doğrulama e-postası gönderilemedi.");

    expect(rollback).toHaveBeenCalledOnce();
    expect(rollback.mock.calls[0]?.[0]).toMatchObject({
      userId: pendingUser.id,
      previousTokenHash: pendingUser.emailVerificationTokenHash,
      previousExpiresAt: pendingUser.emailVerificationExpiresAt,
      previousSentAt: pendingUser.emailVerificationSentAt,
    });
    expect(rollback.mock.calls[0]?.[0].failedTokenHash).toBe(rotate.mock.calls[0]?.[0].tokenHash);
  });
});
