import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommunitySectionNavigation } from "@/components/CommunitySectionNavigation";

const navigationState = vi.hoisted(() => ({ pathname: "/tr/topluluk" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

describe("CommunitySectionNavigation", () => {
  it.each([
    "/tr/topluluk",
    "/tr/ligler",
    "/tr/liderlik-tablosu",
    "/tr/haftalik-liderler",
    "/tr/ligler/davet/örnek",
  ])("renders throughout the community route trees: %s", (pathname) => {
    navigationState.pathname = pathname;

    const html = renderToStaticMarkup(<CommunitySectionNavigation locale="tr" />);

    expect(html).toContain('aria-label="Topluluk bölümü"');
    expect(html).toContain('href="/tr/topluluk"');
    expect(html).toContain('href="/tr/ligler"');
    expect(html).toContain('href="/tr/liderlik-tablosu"');
    expect(html).toContain('href="/tr/haftalik-liderler"');
    expect(html).not.toContain('role="tab"');
  });

  it("marks only the current route link and renders English labels", () => {
    navigationState.pathname = "/en/liderlik-tablosu";

    const html = renderToStaticMarkup(<CommunitySectionNavigation locale="en" />);

    expect(html).toContain("Members");
    expect(html).toContain("Leagues");
    expect(html).toContain("Competition results");
    expect(html).toContain("Weekly archive");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/en\/liderlik-tablosu"/);
  });

  it("stays hidden outside the community routes", () => {
    navigationState.pathname = "/tr/panel";

    expect(renderToStaticMarkup(<CommunitySectionNavigation locale="tr" />)).toBe("");
  });

  it("is mounted by AppShell only for signed-in users behind Suspense", () => {
    const appShellSource = readFileSync(new URL("./AppShell.tsx", import.meta.url), "utf8");

    expect(appShellSource).toContain("<Suspense fallback={null}>");
    expect(appShellSource).toContain("<CommunitySectionNavigation locale={locale} />");
    expect(appShellSource).toMatch(
      /\{sessionUser \? \(\s*<Suspense fallback=\{null\}>\s*<CommunitySectionNavigation locale=\{locale\} \/>\s*<\/Suspense>\s*\) : null\}/,
    );
  });
});
