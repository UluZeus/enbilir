import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocks.createTransport,
  },
}));

import { sendEmail } from "@/lib/email";

const message = {
  to: "member@example.test",
  subject: "Verify",
  text: "token=secret-verification-token",
  html: "<p>token=secret-verification-token</p>",
};

describe("sendEmail delivery guarantees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
  });

  it("fails closed without SMTP configuration and never logs message PII or tokens", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(sendEmail(message)).rejects.toThrow("E-posta teslimatı yapılandırılmamış.");

    expect(infoSpy).not.toHaveBeenCalled();
    expect(mocks.createTransport).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("succeeds only when the target recipient is present in the accepted result", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_FROM", "Enbilir <sender@example.test>");
    mocks.sendMail.mockResolvedValue({
      accepted: ["member@example.test"],
      rejected: [],
    });

    await expect(sendEmail(message)).resolves.toEqual({ skipped: false });

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      connectionTimeout: expect.any(Number),
      greetingTimeout: expect.any(Number),
      socketTimeout: expect.any(Number),
    }));
    const transportOptions = mocks.createTransport.mock.calls[0]?.[0];
    expect(transportOptions.connectionTimeout).toBeGreaterThan(0);
    expect(transportOptions.greetingTimeout).toBeGreaterThan(0);
    expect(transportOptions.socketTimeout).toBeGreaterThan(0);
  });

  it("returns a generic failure when the target recipient is rejected", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_FROM", "Enbilir <sender@example.test>");
    mocks.sendMail.mockResolvedValue({
      accepted: [],
      rejected: ["member@example.test"],
      response: "550 provider-specific private detail",
    });

    await expect(sendEmail(message)).rejects.toThrow("E-posta teslimatı tamamlanamadı.");
  });

  it("does not expose a provider exception through its public error", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_FROM", "Enbilir <sender@example.test>");
    mocks.sendMail.mockRejectedValue(new Error("535 provider credential detail"));

    try {
      await sendEmail(message);
      throw new Error("Expected sendEmail to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("E-posta teslimatı tamamlanamadı.");
      expect((error as Error).message).not.toContain("provider");
    }
  });
});
