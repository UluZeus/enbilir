import { describe, expect, it } from "vitest";
import { getSafeLocaleReturnPath } from "./safe-navigation";

describe("safe locale return paths", () => {
  it("accepts only same-locale application paths", () => {
    expect(getSafeLocaleReturnPath("/tr/vip?payment=success", "tr")).toBe("/tr/vip?payment=success");
    expect(getSafeLocaleReturnPath("/en/vip/ajanlar#history", "en")).toBe("/en/vip/ajanlar#history");
  });

  it("rejects external, protocol-relative, cross-locale and backslash redirects", () => {
    expect(getSafeLocaleReturnPath("https://evil.example/tr/vip", "tr")).toBeNull();
    expect(getSafeLocaleReturnPath("//evil.example/tr/vip", "tr")).toBeNull();
    expect(getSafeLocaleReturnPath("/en/vip", "tr")).toBeNull();
    expect(getSafeLocaleReturnPath("/tr\\evil", "tr")).toBeNull();
    expect(getSafeLocaleReturnPath("/\\\\evil.example", "tr")).toBeNull();
    expect(getSafeLocaleReturnPath("/%5c%5cevil.example", "tr")).toBeNull();
  });
});
