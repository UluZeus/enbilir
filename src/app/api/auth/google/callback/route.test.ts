import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  setSessionCookie: vi.fn(),
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userCreate: vi.fn(),
  oauthUpsert: vi.fn(),
  ensureVirtualAccount: vi.fn(),
  sendGoogleWelcomeEmail: vi.fn(),
  canCreateGoogleAccount: vi.fn(),
  hasRequiredLegalConsents: vi.fn(),
}));

vi.mock("@/i18n/config", () => ({
  getSafeLocale: (value: string) => value === "en" ? "en" : "tr",
}));
vi.mock("@/lib/auth", () => ({ setSessionCookie: mocks.setSessionCookie }));
vi.mock("@/lib/auth-role-policy", () => ({
  getSelfServiceRegistrationDefaults: () => ({
    nickname: null,
    displayNameMode: "REAL_NAME",
    role: "USER",
  }),
}));
vi.mock("@/lib/analytics", () => ({
  recordSiteAnalyticsEvent: vi.fn(),
  siteAnalyticsEvents: { register: "REGISTER" },
}));
vi.mock("@/lib/google-oauth-consent", () => ({
  canCreateGoogleAccount: mocks.canCreateGoogleAccount,
  hasRequiredLegalConsents: mocks.hasRequiredLegalConsents,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: mocks.userFindFirst,
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
      create: mocks.userCreate,
    },
    oAuthAccount: { upsert: mocks.oauthUpsert },
  },
}));
vi.mock("@/lib/portfolio", () => ({ ensureVirtualAccount: mocks.ensureVirtualAccount }));
vi.mock("@/lib/safe-navigation", () => ({
  getSafeLocaleReturnPath: (value: unknown) => typeof value === "string" ? value : null,
}));
vi.mock("@/lib/site-url", () => ({
  getRequestOrigin: () => "https://enbilir.test",
}));
vi.mock("@/lib/welcome-email", () => ({ sendGoogleWelcomeEmail: mocks.sendGoogleWelcomeEmail }));

import { GET } from "@/app/api/auth/google/callback/route";

function createCallbackRequest(code = "synthetic-code", intent: "login" | "register" = "login") {
  const request = new NextRequest(`https://enbilir.test/api/auth/google/callback?code=${code}&state=state-1`);
  request.cookies.set("enbilir_google_oauth_state", JSON.stringify({
    state: "state-1",
    locale: "tr",
    returnTo: null,
    intent,
    kvkkDisclosureAccepted: intent === "register",
    termsAccepted: intent === "register",
    noInvestmentAdviceAccepted: intent === "register",
    electronicCommunicationConsent: false,
  }));
  return request;
}

function mockGoogleSuccess(name: string | null = "Synthetic Member") {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "synthetic-access-token" }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({
      sub: "google-account-1",
      email: "member@example.test",
      email_verified: true,
      ...(name === null ? {} : { name }),
    }), { status: 200 })));
}

describe("Google OAuth callback hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubEnv("GOOGLE_CLIENT_ID", "synthetic-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "synthetic-client-secret");
    mocks.canCreateGoogleAccount.mockReturnValue(false);
    mocks.hasRequiredLegalConsents.mockReturnValue(true);
    mocks.sendGoogleWelcomeEmail.mockResolvedValue(undefined);
  });

  it("completes Google register intent for an inactive unverified email registration with a durable pending token", async () => {
    mockGoogleSuccess();
    mocks.canCreateGoogleAccount.mockReturnValue(true);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue({
      id: "pending-email-user",
      name: "Synthetic Member",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: false,
      emailVerifiedAt: null,
      emailVerificationTokenHash: "durable-pending-token-hash",
      kvkkDisclosureAccepted: true,
      termsAccepted: true,
      noInvestmentAdviceAccepted: true,
    });
    mocks.userUpdate.mockResolvedValue({
      id: "pending-email-user",
      name: "Synthetic Member",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: true,
      kvkkDisclosureAccepted: true,
      termsAccepted: true,
      noInvestmentAdviceAccepted: true,
    });

    const response = await GET(createCallbackRequest("synthetic-code", "register"));
    const location = new URL(response.headers.get("location") ?? "https://enbilir.test");

    expect(location.pathname).toBe("/tr/panel");
    expect(mocks.oauthUpsert).toHaveBeenCalledOnce();
    expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "pending-email-user" },
      data: expect.objectContaining({
        isActive: true,
        emailVerificationTokenHash: null,
      }),
    }));
    expect(mocks.setSessionCookie).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "an inactive account without a durable pending token",
      emailVerifiedAt: null,
      emailVerificationTokenHash: null,
    },
    {
      name: "a previously verified inactive account even if a stale token remains",
      emailVerifiedAt: new Date("2026-07-20T12:00:00.000Z"),
      emailVerificationTokenHash: "stale-token-hash",
    },
  ])("does not reactivate $name during Google register intent", async ({
    emailVerifiedAt,
    emailVerificationTokenHash,
  }) => {
    mockGoogleSuccess();
    mocks.canCreateGoogleAccount.mockReturnValue(true);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue({
      id: "inactive-email-user",
      name: "Synthetic Member",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: false,
      emailVerifiedAt,
      emailVerificationTokenHash,
      kvkkDisclosureAccepted: true,
      termsAccepted: true,
      noInvestmentAdviceAccepted: true,
    });

    const response = await GET(createCallbackRequest("synthetic-code", "register"));
    const location = new URL(response.headers.get("location") ?? "https://enbilir.test");

    expect(location.pathname).toBe("/tr/giris");
    expect(location.searchParams.get("error")).toContain("Hesabınız etkin değil");
    expect(mocks.oauthUpsert).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
  });

  it("does not complete a pending email registration through Google login intent", async () => {
    mockGoogleSuccess();
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue({
      id: "pending-email-user",
      name: "Synthetic Member",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: false,
      emailVerifiedAt: null,
      emailVerificationTokenHash: "durable-pending-token-hash",
      kvkkDisclosureAccepted: true,
      termsAccepted: true,
      noInvestmentAdviceAccepted: true,
    });

    const response = await GET(createCallbackRequest());
    const location = new URL(response.headers.get("location") ?? "https://enbilir.test");

    expect(location.pathname).toBe("/tr/giris");
    expect(mocks.oauthUpsert).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
  });

  it("does not reactivate an inactive linked account", async () => {
    mockGoogleSuccess();
    mocks.userFindFirst.mockResolvedValue({
      id: "inactive-user",
      name: "Synthetic Member",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: false,
      kvkkDisclosureAccepted: true,
      termsAccepted: true,
      noInvestmentAdviceAccepted: true,
    });

    const response = await GET(createCallbackRequest());
    const fetchMock = vi.mocked(fetch);

    const location = new URL(response.headers.get("location") ?? "https://enbilir.test");
    expect(location.pathname).toBe("/tr/giris");
    expect(location.searchParams.get("error")).toContain("Hesabınız etkin değil");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[1]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
    expect(mocks.ensureVirtualAccount).not.toHaveBeenCalled();
  });

  it("uses a neutral non-PII name when Google omits the provider name", async () => {
    mockGoogleSuccess(null);
    mocks.canCreateGoogleAccount.mockReturnValue(true);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({
      id: "new-google-user",
      name: "Google Kullanıcısı",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: true,
      kvkkDisclosureAccepted: true,
      termsAccepted: true,
      noInvestmentAdviceAccepted: true,
    });

    const response = await GET(createCallbackRequest("synthetic-code", "register"));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/tr/panel");
    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: "Google Kullanıcısı",
        email: "member@example.test",
      }),
    }));
    expect(mocks.userCreate.mock.calls[0]?.[0]?.data?.name).not.toBe("member");
  });

  it("does not link or reactivate an inactive account found by email", async () => {
    mockGoogleSuccess();
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue({
      id: "inactive-email-user",
      name: "Synthetic Member",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: false,
      kvkkDisclosureAccepted: true,
      termsAccepted: true,
      noInvestmentAdviceAccepted: true,
    });

    const response = await GET(createCallbackRequest());
    const location = new URL(response.headers.get("location") ?? "https://enbilir.test");

    expect(location.pathname).toBe("/tr/giris");
    expect(location.searchParams.get("error")).toContain("Hesabınız etkin değil");
    expect(mocks.oauthUpsert).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
  });

  it("keeps the required-consent message explicit for an active legacy account", async () => {
    mockGoogleSuccess();
    mocks.hasRequiredLegalConsents.mockReturnValue(false);
    mocks.userFindFirst.mockResolvedValue({
      id: "active-legacy-user",
      name: "Synthetic Member",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: true,
      kvkkDisclosureAccepted: false,
      termsAccepted: false,
      noInvestmentAdviceAccepted: false,
    });

    const response = await GET(createCallbackRequest());
    const location = new URL(response.headers.get("location") ?? "https://enbilir.test");

    expect(location.pathname).toBe("/tr/kayit");
    expect(location.searchParams.get("error")).toContain("zorunlu onayları tamamlayın");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
  });

  it("uses a timeout signal and never exposes provider error details", async () => {
    const providerDetail = "invalid_client_secret_private_detail";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: providerDetail }), { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(createCallbackRequest("private-authorization-code"));
    const location = new URL(response.headers.get("location") ?? "https://enbilir.test");
    const publicError = location.searchParams.get("error") ?? "";
    const logged = JSON.stringify(errorSpy.mock.calls);

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(publicError).toContain("Google giriş işlemi tamamlanamadı");
    expect(publicError).not.toContain(providerDetail);
    expect(publicError).not.toContain("private-authorization-code");
    expect(logged).toContain('"stage":"token"');
    expect(logged).toContain('"status":401');
    expect(logged).not.toContain(providerDetail);
    expect(logged).not.toContain("private-authorization-code");
    errorSpy.mockRestore();
  });
});
