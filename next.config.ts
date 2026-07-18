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
    ];
  },
};

export default nextConfig;
