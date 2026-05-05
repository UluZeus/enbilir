import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSafeLocale, isLocale } from "@/i18n/config";

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

  return <AppShell locale={locale}>{children}</AppShell>;
}
