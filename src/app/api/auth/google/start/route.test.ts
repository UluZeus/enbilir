import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createGoogleOAuthStateToken: vi.fn(),
  oauthStateCreate: vi.fn(),
  oauthStateDeleteMany: vi.fn(),
}));

vi.mock("@/i18n/config", () => ({ getSafeLocale: (value: string) => value === "en" ? "en" : "tr" }));
vi.mock("@/lib/auth", () => ({
  createGoogleOAuthStateToken: mocks.createGoogleOAuthStateToken,
  getGoogleOAuthStateCookieName: () => "__Host-enbilir_google_oauth_state",
  getGoogleOAuthStateCookieOptions: () => ({ httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 600 }),
  GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS: 600,
  hashGoogleOAuthState: () => "synthetic-state-hash",
}));
vi.mock("@/lib/google-oauth-consent", () => ({
  canCreateGoogleAccount: () => true,
  getGoogleOAuthStartContext: () => ({
    intent: "login",
    kvkkDisclosureAccepted: false,
    termsAccepted: false,
    noInvestmentAdviceAccepted: false,
    electronicCommunicationConsent: false,
  }),
}));
vi.mock("@/lib/safe-navigation", () => ({ getSafeLocaleReturnPath: () => "/tr/panel" }));
vi.mock("@/lib/site-url", () => ({ getRequestOrigin: () => "https://enbilir.test" }));
vi.mock("@/lib/prisma", () => ({ prisma: { oAuthState: { create: mocks.oauthStateCreate, deleteMany: mocks.oauthStateDeleteMany } } }));

import { GET } from "@/app/api/auth/google/start/route";

describe("Google OAuth start state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GOOGLE_CLIENT_ID", "synthetic-client-id");
    mocks.createGoogleOAuthStateToken.mockResolvedValue("synthetic-signed-state");
    mocks.oauthStateCreate.mockResolvedValue({ stateHash: "synthetic-state-hash" });
  });

  it("stores a signed, single-use state and emits a hardened __Host- cookie", async () => {
    const response = await GET(new NextRequest("https://enbilir.test/api/auth/google/start?locale=tr"));
    const authorizationUrl = new URL(response.headers.get("location")!);
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(mocks.createGoogleOAuthStateToken).toHaveBeenCalledOnce();
    expect(mocks.oauthStateCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ expiresAt: expect.any(Date), stateHash: expect.any(String) }),
    }));
    expect(authorizationUrl.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(setCookie).toContain("__Host-enbilir_google_oauth_state=synthetic-signed-state");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).not.toContain("Domain=");
  });
});
