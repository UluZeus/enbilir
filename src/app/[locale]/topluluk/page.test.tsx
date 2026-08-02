import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicCompetitionUserWhere } from "@/lib/public-user-visibility";

const { findManyUsers, getSessionUser } = vi.hoisted(() => ({
  findManyUsers: vi.fn(),
  getSessionUser: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("@/components/FormMessage", () => ({ FormMessage: () => null }));
vi.mock("@/components/SiteMotion", () => ({ SiteMotion: () => null }));
vi.mock("@/lib/actions", () => ({
  removeCommunityFriendAction: vi.fn(),
  sendCommunityFriendRequestAction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getSessionUser,
  getDisplayName: (user: { name: string; nickname: string | null; displayNameMode: "REAL_NAME" | "NICKNAME" }) =>
    user.displayNameMode === "NICKNAME" ? user.nickname ?? user.name : user.name,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: findManyUsers },
    friendRequest: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/seo", () => ({ buildPageMetadata: vi.fn(() => ({})) }));

import CommunityPage from "./page";

const users = [
  {
    id: "public-nickname",
    name: "Hidden Legal Name",
    email: "public.nickname@example.test",
    nickname: "Safe Alias",
    displayNameMode: "NICKNAME" as const,
    leagueMemberships: [],
  },
  {
    id: "private-label",
    name: "private.person",
    email: "private.person@example.test",
    nickname: "Hidden Alternate",
    displayNameMode: "REAL_NAME" as const,
    leagueMemberships: [],
  },
];

describe("CommunityPage public identity rendering", () => {
  beforeEach(() => {
    findManyUsers.mockReset();
    findManyUsers.mockResolvedValue(users);
    getSessionUser.mockReset();
    getSessionUser.mockResolvedValue(null);
  });

  it("lists only active verified users and renders only the selected safe public label", async () => {
    const html = renderToStaticMarkup(await CommunityPage({
      params: Promise.resolve({ locale: "tr" }),
    }));

    expect(findManyUsers).toHaveBeenCalledWith(expect.objectContaining({
      where: publicCompetitionUserWhere,
      select: expect.objectContaining({ email: true }),
    }));
    expect(html).toContain("Safe Alias");
    expect(html).toContain("Gizli katılımcı");
    expect(html).not.toContain("Hidden Legal Name");
    expect(html).not.toContain("private.person");
    expect(html).not.toContain("Hidden Alternate");
  });

  it("does not search private identifiers or hidden alternates and localizes the generic fallback", async () => {
    const hiddenNameSearchHtml = renderToStaticMarkup(await CommunityPage({
      params: Promise.resolve({ locale: "tr" }),
      searchParams: Promise.resolve({ q: "Hidden Legal Name" }),
    }));
    const localPartSearchHtml = renderToStaticMarkup(await CommunityPage({
      params: Promise.resolve({ locale: "tr" }),
      searchParams: Promise.resolve({ q: "private.person" }),
    }));
    const emailSearchHtml = renderToStaticMarkup(await CommunityPage({
      params: Promise.resolve({ locale: "tr" }),
      searchParams: Promise.resolve({ q: "private.person@example.test" }),
    }));
    const alternateSearchHtml = renderToStaticMarkup(await CommunityPage({
      params: Promise.resolve({ locale: "tr" }),
      searchParams: Promise.resolve({ q: "Hidden Alternate" }),
    }));
    const englishHtml = renderToStaticMarkup(await CommunityPage({
      params: Promise.resolve({ locale: "en" }),
    }));

    expect(hiddenNameSearchHtml).not.toContain('href="/tr/topluluk/public-nickname"');
    expect(hiddenNameSearchHtml).not.toContain("Safe Alias");
    expect(localPartSearchHtml).not.toContain('href="/tr/topluluk/private-label"');
    expect(emailSearchHtml).not.toContain('href="/tr/topluluk/private-label"');
    expect(alternateSearchHtml).not.toContain('href="/tr/topluluk/private-label"');
    expect(englishHtml).toContain("Private participant");
    expect(englishHtml).not.toContain("private.person");
    expect(englishHtml).not.toContain("Hidden Alternate");
  });
});
