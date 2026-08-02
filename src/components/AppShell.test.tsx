import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AppShell primary navigation", () => {
  it("makes the existing leaderboard route available to authenticated desktop and mobile menus", () => {
    const source = readFileSync(new URL("./AppShell.tsx", import.meta.url), "utf8");

    expect(source).toContain('{ href: "liderlik-tablosu", label: "leaderboard" }');
    expect(source).toMatch(/sessionUser \? \["", "baslangic", "ogren", "liderlik-tablosu", "topluluk"\]/);
    expect(source).toContain("const mobilePrimaryLinks = primaryLinks;");
  });
});
