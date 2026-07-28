import { execFileSync } from "node:child_process";

import type { NextConfig } from "next";

const legacyLocalizedRoutePrefixes = [
  "acik-riza",
  "admin",
  "ai-piyasa-asistani",
  "baslangic",
  "blog",
  "cerez-politikasi",
  "egitim",
  "giris",
  "haftalik-liderler",
  "icerik-merkezi",
  "iletisim",
  "islem-yap",
  "kayit",
  "kullanim-kilavuzu",
  "kullanim-sartlari",
  "kvkk",
  "liderlik-tablosu",
  "ligler",
  "ogren",
  "panel",
  "risk-istahi-testi",
  "siteyi-anlamak",
  "sohbet",
  "topluluk",
  "vip",
  "yatirim-tavsiyesi-degildir",
] as const;

const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const nextConfig: NextConfig = {
  output: "standalone",
  generateBuildId: async () => {
    const commitSha = (process.env.ENBILIR_BUILD_COMMIT || execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    })).trim();
    if (!/^[a-f0-9]{40}$/.test(commitSha)) {
      throw new Error("ENBILIR_BUILD_COMMIT must be the full immutable Git commit SHA.");
    }
    return commitSha;
  },
  outputFileTracingExcludes: {
    "/*": [".env", ".env.*", "*.log", "**/*.log", "artifacts/**/*", ".data/**/*"],
  },
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.enbilir.com" }],
        destination: "https://enbilir.com/:path*",
        permanent: true,
      },
      { source: "/", destination: "/tr", permanent: true },
      ...legacyLocalizedRoutePrefixes.map((prefix) => ({
        source: `/${prefix}/:path*`,
        destination: `/tr/${prefix}/:path*`,
        permanent: true,
      })),
      { source: "/ai-asistani/:path*", destination: "/tr/ai-piyasa-asistani/:path*", permanent: true },
      { source: "/tr/ai-asistani/:path*", destination: "/tr/ai-piyasa-asistani/:path*", permanent: true },
      { source: "/en/ai-asistani/:path*", destination: "/en/ai-piyasa-asistani/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; frame-src 'self' https://www.youtube.com https://player.vimeo.com; font-src 'self' data:; connect-src 'self' https://stooq.com wss: ws:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
      {
        source: "/uploads/chat/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Content-Disposition", value: "attachment" },
          { key: "Content-Security-Policy", value: "sandbox; default-src 'none'" },
          { key: "Content-Type", value: "application/octet-stream" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
