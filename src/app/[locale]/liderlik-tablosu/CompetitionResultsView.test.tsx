import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

import {
  CompetitionResultsView,
  resolveCompetitionPage,
  resolveCompetitionPeriodKey,
} from "./CompetitionResultsView";

const rows = [
  { displayName: "Birinci Katılımcı", rank: 1, returnPercent: 12.5, isViewer: false },
  { displayName: "İkinci Katılımcı", rank: 2, returnPercent: 8.25, isViewer: false },
  { displayName: "Senin Görünen Adın", rank: 3, returnPercent: 5, isViewer: true },
  { displayName: "Dördüncü Katılımcı", rank: 4, returnPercent: 1, isViewer: false },
  { displayName: "Beşinci Katılımcı", rank: 5, returnPercent: -2, isViewer: false },
  { displayName: "Altıncı Katılımcı", rank: 6, returnPercent: -4.75, isViewer: false },
];

const periodKeys = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "YEARLY"] as const;
const periods = periodKeys.map((key, index) => ({
  key,
  requestedDays: [1, 7, 30, 90, 180, 365][index],
  rangeStartsAt: "2026-07-01T09:00:00.000Z",
  valuationAsOf: "2026-07-31T09:00:00.000Z",
  totalRankedParticipants: key === "YEARLY" ? 0 : rows.length,
  leaderReturnPercent: key === "YEARLY" ? null : rows[0].returnPercent,
  topRows: key === "YEARLY" ? [] : rows.slice(0, 3),
  bottomRows: key === "YEARLY" ? [] : rows.slice(3),
  rows: key === "WEEKLY" ? rows : [],
  viewerRow: key === "WEEKLY"
    ? {
        displayName: "Senin Görünen Adın",
        rank: 3,
        returnPercent: 5,
        valueUsd: 1234567890123.78,
        changeUsd: 234567890123.78,
      }
    : null,
  page: 1,
  pageSize: 25,
  pageCount: 1,
  firstRowIndex: key === "WEEKLY" ? 1 : 0,
  lastRowIndex: key === "WEEKLY" ? rows.length : 0,
  viewerPage: key === "WEEKLY" ? 1 : null,
  excludedCounts: { partialOrMissing: key === "YEARLY" ? 6 : 0, stalePrice: 2, unreliable: 1 },
}));

describe("CompetitionResultsView", () => {
  it("defaults missing, repeated, and invalid period queries to weekly", () => {
    expect(resolveCompetitionPeriodKey(undefined)).toBe("WEEKLY");
    expect(resolveCompetitionPeriodKey(["DAILY", "YEARLY"])).toBe("WEEKLY");
    expect(resolveCompetitionPeriodKey("not-a-period")).toBe("WEEKLY");
    expect(resolveCompetitionPeriodKey("monthly")).toBe("MONTHLY");
  });

  it("accepts only safe, one-based leaderboard page queries", () => {
    expect(resolveCompetitionPage(undefined)).toBe(1);
    expect(resolveCompetitionPage(["2", "3"])).toBe(1);
    expect(resolveCompetitionPage("0")).toBe(1);
    expect(resolveCompetitionPage("-2")).toBe(1);
    expect(resolveCompetitionPage("1.5")).toBe(1);
    expect(resolveCompetitionPage("2e3")).toBe(1);
    expect(resolveCompetitionPage("0004")).toBe(4);
    expect(resolveCompetitionPage("25")).toBe(25);
  });

  it("renders accessible period navigation, privacy-safe standings, and equivalent responsive structures", () => {
    const html = renderToStaticMarkup(
      <CompetitionResultsView
        locale="tr"
        periods={periods}
        selectedPeriodKey="WEEKLY"
        leagues={[
          {
            id: "league-1",
            name: "Çok Uzun İstanbul Öğrenme ve Dayanışma Ligi",
            slug: "istanbul-ogrenme",
            type: "ROTARY",
            rank: 123456789012345,
            totalRankedMembers: 987654321012345,
            viewerReturnPercent: 1234567890.12,
          },
        ]}
      />,
    );

    expect((html.match(/donem=/g) ?? [])).toHaveLength(6);
    expect(html).toContain('href="/tr/liderlik-tablosu?donem=WEEKLY&amp;sayfa=1"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('role="tab"');
    expect(html.indexOf("#1")).toBeLessThan(html.indexOf("#2"));

    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
    expect(html).toContain("<ol");
    expect(html).toContain("<dl");
    expect(html).toContain("Sen");
    expect(html).toContain("123456789012345 / 987654321012345");
    expect(html).toContain("+1.234.567.890,12%");
    expect(html).toMatch(/data-league-metrics="true" class="[^"]*grid-cols-1[^"]*sm:grid-cols-2[^"]*"/);
    expect(html).toMatch(/data-league-metric="rank" class="[^"]*break-all[^"]*"/);
    expect(html).toMatch(/data-league-metric="return" class="[^"]*break-all[^"]*"/);
    expect(html).not.toMatch(/data-league-metric="[^"]+" class="[^"]*whitespace-nowrap/);
    expect(html).toContain('href="/tr/ligler/istanbul-ogrenme"');

    expect(html).toContain("$1.234.567.890.123,78");
    expect(html).toContain("+$234.567.890.123,78");
    expect(html).toMatch(/data-private-money="profit-loss" class="[^"]*break-all[^"]*"/);
    expect(html).toMatch(/data-private-money="current-value" class="[^"]*break-all[^"]*"/);
    expect(html).not.toMatch(/data-private-money="[^"]+" class="[^"]*whitespace-nowrap/);
    expect(html).not.toContain("$999.999");
    expect(html).toContain("canlı dönem görünümü");
    expect(html).toContain('href="/tr/haftalik-liderler"');
    expect(html).toContain("en az bir tamamlanmış sanal işlem");
  });

  it("does not display real sub-cent returns as zero and normalizes signed zero", () => {
    const precisionPeriods = periods.map((period) => period.key === "WEEKLY"
      ? {
          ...period,
          rows: [
            { displayName: "Küçük artış", rank: 1, returnPercent: 0.0049, isViewer: false },
            { displayName: "Gerçek sıfır", rank: 2, returnPercent: -0, isViewer: true },
            { displayName: "Küçük azalış", rank: 3, returnPercent: -0.0049, isViewer: false },
          ],
          viewerRow: {
            ...period.viewerRow!,
            rank: 2,
            returnPercent: -0,
          },
        }
      : period);
    const html = renderToStaticMarkup(
      <CompetitionResultsView locale="tr" periods={precisionPeriods} selectedPeriodKey="WEEKLY" leagues={[]} />,
    );

    expect(html).toContain("+0,0049% · Artış");
    expect(html).toContain("-0,0049% · Azalış");
    expect(html).toContain("0,00% · Değişim yok");
    expect(html).not.toContain("-0,00%");
  });

  it("states that stale and unreliable prices are excluded instead of used", () => {
    const turkishHtml = renderToStaticMarkup(
      <CompetitionResultsView locale="tr" periods={periods} selectedPeriodKey="WEEKLY" leagues={[]} />,
    );
    const englishHtml = renderToStaticMarkup(
      <CompetitionResultsView locale="en" periods={periods} selectedPeriodKey="WEEKLY" leagues={[]} />,
    );

    expect(turkishHtml).toContain("2 portföyde güncel fiyat eski, 1 portföyde doğrulanmış güncel fiyat yok");
    expect(turkishHtml).toContain("Bu değerler sıralamada kullanılmadı");
    expect(englishHtml).toContain("2 portfolio(s) have a stale current price, 1 portfolio(s) lack a verified current price");
    expect(englishHtml).toContain("Those values were not used in the ranking");
  });

  it("states honestly when a period has no fully covered ranking history", () => {
    const html = renderToStaticMarkup(
      <CompetitionResultsView locale="en" periods={periods} selectedPeriodKey="YEARLY" leagues={[]} />,
    );
    const turkishHtml = renderToStaticMarkup(
      <CompetitionResultsView locale="tr" periods={periods} selectedPeriodKey="YEARLY" leagues={[]} />,
    );

    expect(html).toContain("No eligible participant has complete history for this period yet.");
    expect(html).toContain("This does not mean the period return is zero.");
    expect(html).toContain("6 portfolio(s) lack complete period history");
    expect(html).not.toContain("$1,234,567,890,123.78");
    expect(turkishHtml).toContain("Bu, dönem getirisinin yüzde sıfır olduğu anlamına gelmez.");
  });

  it("keeps unavailable periods compact while preserving all six accessible result links", () => {
    const unavailablePeriods = periods.map((period) => ({
      ...period,
      totalRankedParticipants: 0,
      leaderReturnPercent: null,
      topRows: [],
      bottomRows: [],
      rows: [],
      viewerRow: null,
      firstRowIndex: 0,
      lastRowIndex: 0,
      viewerPage: null,
    }));
    const html = renderToStaticMarkup(
      <CompetitionResultsView locale="tr" periods={unavailablePeriods} selectedPeriodKey="YEARLY" leagues={[]} />,
    );

    expect(html).toContain('data-unavailable-period-summaries="true"');
    expect((html.match(/data-period-summary-card="available"/g) ?? [])).toHaveLength(0);
    expect((html.match(/data-unavailable-period-link="true"/g) ?? [])).toHaveLength(6);
    expect((html.match(/Bu, dönem getirisinin yüzde sıfır olduğu anlamına gelmez\./g) ?? [])).toHaveLength(2);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/tr/liderlik-tablosu?donem=DAILY&amp;sayfa=1"');
    expect(html).toContain('href="/tr/liderlik-tablosu?donem=YEARLY&amp;sayfa=1"');
  });

  it("renders page links, range, and a private viewer shortcut without loading all participants", () => {
    const manyRows = Array.from({ length: 53 }, (_, index) => ({
      displayName: `Katılımcı ${index + 1}`,
      rank: index + 1,
      returnPercent: 54 - index,
      isViewer: index === 51,
    }));
    const paginatedPeriods = periods.map((period) => period.key === "WEEKLY"
      ? {
          ...period,
          totalRankedParticipants: 53,
          leaderReturnPercent: 53,
          topRows: manyRows.slice(0, 3),
          bottomRows: manyRows.slice(50),
          rows: manyRows.slice(25, 50),
          viewerRow: {
            displayName: "Katılımcı 52",
            rank: 52,
            returnPercent: 2,
            valueUsd: 200,
            changeUsd: 4,
          },
          page: 2,
          pageCount: 3,
          firstRowIndex: 26,
          lastRowIndex: 50,
          viewerPage: 3,
        }
      : period);
    const html = renderToStaticMarkup(
      <CompetitionResultsView locale="tr" periods={paginatedPeriods} selectedPeriodKey="WEEKLY" leagues={[]} />,
    );

    expect(html).toContain("26–50 / 53");
    expect(html).toContain('href="/tr/liderlik-tablosu?donem=WEEKLY&amp;sayfa=1"');
    expect(html).toContain('href="/tr/liderlik-tablosu?donem=WEEKLY&amp;sayfa=3"');
    expect(html).toContain('href="/tr/liderlik-tablosu?donem=WEEKLY&amp;sayfa=3"');
    expect(html).toContain("Sıramı aç");
    expect(html).toContain("Liderle fark");
    expect(html).not.toContain("Katılımcı 53</th>");
  });

  it("uses backend-provided, disjoint winner and loser summaries", () => {
    const fourRows = rows.slice(0, 4);
    const disjointPeriods = periods.map((period) => period.key === "WEEKLY"
      ? { ...period, totalRankedParticipants: 4, topRows: fourRows.slice(0, 3), bottomRows: fourRows.slice(3), rows: fourRows, lastRowIndex: 4 }
      : period).filter((period) => period.key === "WEEKLY");
    const html = renderToStaticMarkup(
      <CompetitionResultsView locale="tr" periods={disjointPeriods} selectedPeriodKey="WEEKLY" leagues={[]} />,
    );

    const topList = html.match(/data-summary-list="top"[\s\S]*?<\/ol>/)?.[0] ?? "";
    const bottomList = html.match(/data-summary-list="bottom"[\s\S]*?<\/ol>/)?.[0] ?? "";

    expect(topList).toContain("Birinci Katılımcı");
    expect(topList).toContain("Senin Görünen Adın");
    expect(bottomList).toContain("Dördüncü Katılımcı");
    expect(bottomList).not.toContain("Birinci Katılımcı");
  });
});
