import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { coreSeoKeywords, getSeoPage, seoBrand } from "@/lib/seo";
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

const homeSeo = getSeoPage("home", "tr");

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: homeSeo.title,
    template: "%s | Enbilir",
  },
  description: homeSeo.description,
  keywords: coreSeoKeywords,
  authors: [{ name: seoBrand.founder, url: getSiteUrl() }],
  creator: seoBrand.founder,
  publisher: seoBrand.legalName,
  category: "financial literacy, education, virtual trading, AI market reports",
  alternates: {
    canonical: "/tr",
    languages: {
      tr: "/tr",
      en: "/en",
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    url: "/tr",
    siteName: seoBrand.domain,
    title: homeSeo.title,
    description: homeSeo.description,
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Enbilir finansal okuryazarlık platformu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeSeo.title,
    description: homeSeo.description,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
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
