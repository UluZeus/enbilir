import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import robots from "@/app/robots";

describe("SEO routing", () => {
  it("keeps only API endpoints blocked from crawling", () => {
    expect(robots().rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    });
  });

  it("defines permanent Turkish redirects for unlocalized legacy routes", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: "/:path*",
        has: [{ type: "host", value: "www.enbilir.com" }],
        destination: "https://enbilir.com/:path*",
        permanent: true,
      }),
      expect.objectContaining({ source: "/", destination: "/tr", permanent: true }),
      expect.objectContaining({ source: "/blog/:path*", destination: "/tr/blog/:path*", permanent: true }),
      expect.objectContaining({ source: "/egitim/:path*", destination: "/tr/egitim/:path*", permanent: true }),
      expect.objectContaining({ source: "/ai-piyasa-asistani/:path*", destination: "/tr/ai-piyasa-asistani/:path*", permanent: true }),
      expect.objectContaining({ source: "/ligler/:path*", destination: "/tr/ligler/:path*", permanent: true }),
      expect.objectContaining({ source: "/topluluk/:path*", destination: "/tr/topluluk/:path*", permanent: true }),
    ]));
  });
});
