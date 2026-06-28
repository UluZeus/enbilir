import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSafeLocale, isLocale } from "@/i18n/config";
import { buildPageMetadata, buildStructuredData, stringifyJsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) {
    return {};
  }

  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/", page: "home" });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale = getSafeLocale(rawLocale);
  const structuredData = buildStructuredData(locale);

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(structuredData) }}
      />
      <AppShell locale={locale}>{children}</AppShell>
    </>
  );
}
