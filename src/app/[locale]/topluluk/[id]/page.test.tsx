import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicCompetitionUserWhere } from "@/lib/public-user-visibility";

const { findFirstUser } = vi.hoisted(() => ({ findFirstUser: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("@/lib/badges", () => ({ getBadgeDashboard: vi.fn(async () => []) }));
vi.mock("@/lib/portfolio-health", () => ({
  calculatePortfolioHealth: vi.fn(() => ({ score: 80, riskLabelEn: "Balanced", riskLabelTr: "Dengeli", grade: "B" })),
}));
vi.mock("@/lib/portfolio", () => ({
  calculateCompetitionReturnPercent: vi.fn(() => 0),
  formatMoney: vi.fn((value: number) => `$${value}`),
  getPortfolioSnapshot: vi.fn(async () => ({ totalValueUsd: 0, positions: [] })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: findFirstUser },
    virtualTrade: { count: vi.fn(async () => 0) },
  },
}));
vi.mock("@/lib/seo", () => ({ buildPageMetadata: vi.fn(() => ({})) }));

import CommunityProfilePage from "./page";

const privateUser = {
  id: "private-profile",
  name: "private.profile",
  email: "private.profile@example.test",
  nickname: "Hidden Alternate",
  displayNameMode: "REAL_NAME" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  leagueMemberships: [],
};

describe("CommunityProfilePage public identity rendering", () => {
  beforeEach(() => {
    findFirstUser.mockReset();
    findFirstUser.mockResolvedValue(privateUser);
  });

  it("filters the profile to active verified users and renders a localized safe fallback", async () => {
    const turkishHtml = renderToStaticMarkup(await CommunityProfilePage({
      params: Promise.resolve({ locale: "tr", id: privateUser.id }),
    }));
    const englishHtml = renderToStaticMarkup(await CommunityProfilePage({
      params: Promise.resolve({ locale: "en", id: privateUser.id }),
    }));

    expect(findFirstUser).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: privateUser.id, ...publicCompetitionUserWhere },
      select: expect.objectContaining({ email: true }),
    }));
    expect(turkishHtml).toContain("Gizli katılımcı");
    expect(englishHtml).toContain("Private participant");
    expect(turkishHtml).not.toContain("private.profile");
    expect(turkishHtml).not.toContain("Hidden Alternate");
    expect(englishHtml).not.toContain("private.profile");
    expect(englishHtml).not.toContain("Hidden Alternate");
  });
});
