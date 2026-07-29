import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MarketRadarPanel,
  resolveRadarMotionState,
} from "@/components/ai-market/MarketRadarPanel";

describe("MarketRadarPanel ticker motion", () => {
  it("renders an animated, mirrored ticker for the normal desktop default", () => {
    const html = renderToStaticMarkup(<MarketRadarPanel locale="en" />);

    expect(html).toContain("animation: ai-market-radar-ticker 64s linear infinite");
    expect(html).toContain("ai-market-radar-track--auto");
    expect(
      html.match(/class="ai-market-radar-pass ai-market-radar-pass--mirror/g),
    ).toHaveLength(3);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Pause feed");
  });

  it("uses an accurate complete static presentation for reduced motion until explicitly started", () => {
    expect(resolveRadarMotionState("auto", true)).toEqual({
      isRunning: false,
      isStatic: true,
      isPaused: false,
    });
    expect(resolveRadarMotionState("running", true)).toEqual({
      isRunning: true,
      isStatic: false,
      isPaused: false,
    });
    expect(resolveRadarMotionState("paused", true)).toEqual({
      isRunning: false,
      isStatic: true,
      isPaused: true,
    });
  });

  it("scopes the reduced-motion override and removes the duplicate mirrored pass while static", () => {
    const componentSource = readFileSync(
      new URL("./MarketRadarPanel.tsx", import.meta.url),
      "utf8",
    );
    const globalCss = readFileSync(
      new URL("../../app/globals.css", import.meta.url),
      "utf8",
    );

    expect(componentSource).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(componentSource).toContain("isRunning ? (");
    expect(componentSource).toContain("ai-market-radar-track--static");
    expect(globalCss).toContain(
      ".ai-market-radar-track--auto",
    );
    expect(globalCss).not.toMatch(
      /\.macro-report-ticker__track,\s*\.ai-market-radar-track\s*\{/,
    );
  });

  it("keeps the 30-second data refresh independent from visual pause state", () => {
    const componentSource = readFileSync(
      new URL("./MarketRadarPanel.tsx", import.meta.url),
      "utf8",
    );
    const refreshEffect = componentSource.slice(
      componentSource.indexOf("const initialId = window.setTimeout"),
      componentSource.indexOf("return ("),
    );

    expect(refreshEffect).toContain("MARKET_SCAN_MS");
    expect(refreshEffect).not.toContain("isPaused");
  });
});
