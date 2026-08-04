import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: mocks.cookieGet,
    set: mocks.cookieSet,
    delete: mocks.cookieDelete,
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

import {
  createGoogleOAuthStateToken,
  createSession,
  createSessionToken,
  getSessionCookieName,
  getSessionUser,
  revokeUserSessions,
  verifyGoogleOAuthStateToken,
} from "@/lib/auth";

describe("session authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses the persisted role and never reverses an administrator demotion during a request", async () => {
    const token = await createSessionToken({
      id: "user-1",
      name: "Test User",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "hakan@ultraakil.com",
      role: "MASTER_ADMIN",
    });
    mocks.cookieGet.mockReturnValue({ value: token });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "hakan@ultraakil.com",
      role: "USER",
      isActive: true,
      sessionVersion: 0,
    });

    await expect(getSessionUser()).resolves.toMatchObject({ role: "USER" });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("issues a production __Host- session cookie without a Domain attribute", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "synthetic-auth-secret-with-at-least-thirty-two-characters");
    mocks.userFindUnique.mockResolvedValue({ sessionVersion: 0 });

    await createSession({
      id: "user-1",
      name: "Test User",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
    });

    expect(getSessionCookieName()).toBe("__Host-enbilir_session");
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "__Host-enbilir_session",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      }),
    );
    expect(mocks.cookieSet.mock.calls[0]?.[2]).not.toHaveProperty("domain");
  });

  it("does not consult the legacy session cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "synthetic-auth-secret-with-at-least-thirty-two-characters");
    mocks.cookieGet.mockImplementation((name: string) => (
      name === "enbilir_session" ? { value: "legacy-token" } : undefined
    ));

    await expect(getSessionUser()).resolves.toBeNull();
    expect(mocks.cookieGet).toHaveBeenCalledWith("__Host-enbilir_session");
    expect(mocks.cookieGet).not.toHaveBeenCalledWith("enbilir_session");
  });

  it("rejects a legacy token without a session version in production", async () => {
    const secret = "synthetic-auth-secret-with-at-least-thirty-two-characters";
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", secret);
    const legacyToken = await new SignJWT({ id: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(secret));
    mocks.cookieGet.mockReturnValue({ value: legacyToken });

    await expect(getSessionUser()).resolves.toBeNull();
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a copied token after its persisted session version is revoked", async () => {
    const token = await createSessionToken({
      id: "user-1",
      name: "Test User",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
    }, 0);
    mocks.cookieGet.mockReturnValue({ value: token });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      nickname: null,
      displayNameMode: "REAL_NAME",
      email: "member@example.test",
      role: "USER",
      isActive: true,
      sessionVersion: 1,
    });

    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("increments the server-side session version during revocation", async () => {
    mocks.userUpdate.mockResolvedValue({ id: "user-1" });

    await revokeUserSessions("user-1");

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { sessionVersion: { increment: 1 } },
    });
  });

  it("rejects a tampered signed Google OAuth state", async () => {
    const token = await createGoogleOAuthStateToken({
      state: "synthetic-state",
      locale: "tr",
      returnTo: "/tr/panel",
      intent: "login",
      kvkkDisclosureAccepted: false,
      termsAccepted: false,
      noInvestmentAdviceAccepted: false,
      electronicCommunicationConsent: false,
    });

    await expect(verifyGoogleOAuthStateToken(`${token}tampered`)).resolves.toBeNull();
  });
});
