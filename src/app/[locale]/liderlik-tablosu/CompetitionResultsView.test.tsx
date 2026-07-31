import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

import { CompetitionResultsView, resolveCompetitionPeriodKey } from "./CompetitionResultsView";

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
  rows: key === "YEARLY" ? [] : rows,
  viewerRow: key === "WEEKLY"
    ? {
        displayName: "Senin Görünen Adın",
        rank: 3,
        returnPercent: 5,
        valueUsd: 1234567890123.78,
        changeUsd: 234567890123.78,
      }
    : null,
  excludedCounts: { partialOrMissing: key === "YEARLY" ? 6 : 0, unreliable: 1 },
  delayedValuationCount: key === "WEEKLY" ? 2 : 0,
}));

describe("CompetitionResultsView", () => {
  it("defaults missing, repeated, and invalid period queries to weekly", () => {
    expect(resolveCompetitionPeriodKey(undefined)).toBe("WEEKLY");
    expect(resolveCompetitionPeriodKey(["DAILY", "YEARLY"])).toBe("WEEKLY");
    expect(resolveCompetitionPeriodKey("not-a-period")).toBe("WEEKLY");
    expect(resolveCompetitionPeriodKey("monthly")).toBe("MONTHLY");
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
    expect(html).toContain('href="/tr/liderlik-tablosu?donem=WEEKLY"');
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

  it("discloses delayed verified valuations without implying unverified prices were used", () => {
    const turkishHtml = renderToStaticMarkup(
      <CompetitionResultsView locale="tr" periods={periods} selectedPeriodKey="WEEKLY" leagues={[]} />,
    );
    const englishHtml = renderToStaticMarkup(
      <CompetitionResultsView locale="en" periods={periods} selectedPeriodKey="WEEKLY" leagues={[]} />,
    );

    expect(turkishHtml).toContain("2 portföy, canlı sağlayıcı kesintisi nedeniyle son 72 saat içindeki doğrulanmış saklı değerle hesaplandı");
    expect(turkishHtml).toContain("doğrulanmamış fiyat kullanılmadı");
    expect(turkishHtml).toContain("sıralamanın veri anını etkileyebilir");
    expect(englishHtml).toContain("2 portfolios were calculated with a verified stored value from the last 72 hours due to a live provider outage");
    expect(englishHtml).toContain("no unverified price was used");
    expect(englishHtml).toContain("may affect the ranking valuation time");
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
});
