import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f5f7fb] text-[#152033] selection:bg-[#f5a623]/30 selection:text-[#101827]">
        {children}
      </body>
    </html>
  );
}
