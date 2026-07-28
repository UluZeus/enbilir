import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: mocks.cookieGet,
    set: vi.fn(),
    delete: vi.fn(),
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

import { createSessionToken, getSessionUser } from "@/lib/auth";

describe("session authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });

    await expect(getSessionUser()).resolves.toMatchObject({ role: "USER" });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
});
