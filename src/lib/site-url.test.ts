import { afterEach, describe, expect, it, vi } from "vitest";
import { getRequestOrigin, getSiteUrl } from "@/lib/site-url";

describe("site URL security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a production Host-header fallback when the canonical URL is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(() => getRequestOrigin({ nextUrl: { origin: "https://attacker.example" } })).toThrow(
      "Production site URL configuration is invalid.",
    );
  });

  it("rejects malformed production canonical URLs", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "javascript:alert(1)");

    expect(() => getSiteUrl()).toThrow("Production site URL configuration is invalid.");
  });

  it("retains request-origin fallback during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(getRequestOrigin({ nextUrl: { origin: "http://localhost:3000" } })).toBe("http://localhost:3000");
  });
});
