import { describe, expect, it } from "vitest";
import { getLocalizedPath, getManagedContentIdForLocale, getManagedContentLocalizedIds } from "@/i18n/localized-path";

describe("localized managed-content paths", () => {
  it("adds the English suffix when switching a Turkish blog article", () => {
    expect(getLocalizedPath("/tr/blog/managed-bilanco", "en", "tr")).toBe("/en/blog/managed-bilanco-en");
  });

  it("removes the English suffix when switching an education article to Turkish", () => {
    expect(getLocalizedPath("/en/egitim/icerik-1-en", "tr", "en")).toBe("/tr/egitim/icerik-1");
  });

  it("does not duplicate suffixes when the selected locale is already active", () => {
    expect(getLocalizedPath("/en/blog/article-en", "en", "en")).toBe("/en/blog/article-en");
  });

  it("keeps ordinary localized routes unchanged apart from the locale prefix", () => {
    expect(getLocalizedPath("/tr/ai-piyasa-asistani/raporlar", "en", "tr")).toBe("/en/ai-piyasa-asistani/raporlar");
  });

  it("builds canonical IDs and translation pairs", () => {
    expect(getManagedContentIdForLocale("article-en", "tr")).toBe("article");
    expect(getManagedContentLocalizedIds("article")).toEqual({ tr: "article", en: "article-en" });
  });
});
