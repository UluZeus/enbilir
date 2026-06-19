import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";

const manrope = Manrope({
  variable: "--font-enbilir-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-enbilir-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Enbilir",
  description: "Finansal okuryazarlık ve eğitim platformu.",
  alternates: {
    canonical: "/tr",
    languages: {
      tr: "/tr",
      en: "/en",
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    url: "/tr",
    siteName: "enbilir.com",
    title: "Enbilir",
    description: "Finansal okuryazarlık ve eğitim platformu.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Enbilir",
    description: "Finansal okuryazarlık ve eğitim platformu.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f6f1ed] text-[#49494b] selection:bg-[#bd8c7d]/25 selection:text-[#49494b]">
        {children}
      </body>
    </html>
  );
}
