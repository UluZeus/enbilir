import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

import { MemberPortfolioOverview } from "./MemberPortfolioOverview";

const baseProps = {
  locale: "tr" as const,
  totalValueUsd: 125000,
  cashValueUsd: 25000,
  items: [],
  performancePeriods: [],
};

describe("MemberPortfolioOverview leaderboard ranks", () => {
  it("shows global and league ranks with the viewer's global leaderboard page", () => {
    const html = renderToStaticMarkup(
      <MemberPortfolioOverview
        {...baseProps}
        rankSummary={{
          viewerRank: 52,
          totalRankedParticipants: 53,
          pageSize: 25,
          viewerLeagues: [{
            id: "league-rotary-long",
            name: "Çok Uzun İstanbul Öğrenme ve Dayanışma Ligi",
            slug: "cok-uzun-istanbul-ogrenme-ve-dayanisma-ligi",
            type: "ROTARY",
            rank: 12,
            totalRankedMembers: 210,
          }],
        }}
      />,
    );

    expect(html).toContain("Genel portföy sıran");
    expect(html).toContain("#52 / 53");
    expect(html).toContain("#12 / 210");
    expect(html).toContain('href="/tr/liderlik-tablosu?toplamSayfa=3"');
    expect(html).toContain("break-words");
  });

  it("truthfully shows the unranked state without rendering a zero rank", () => {
    const html = renderToStaticMarkup(
      <MemberPortfolioOverview
        {...baseProps}
        rankSummary={{ viewerRank: null, totalRankedParticipants: 0, pageSize: 25, viewerLeagues: [] }}
      />,
    );

    expect(html).toContain("Henüz sıralamada değilsin");
    expect(html).not.toContain("#0");
  });
});
