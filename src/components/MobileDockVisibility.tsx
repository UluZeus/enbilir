"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";

export function MobileDockVisibility({ children, locale }: { children: ReactNode; locale: Locale }) {
  const pathname = usePathname();
  const isAuthPage = pathname === `/${locale}/giris` || pathname === `/${locale}/kayit`;

  if (isAuthPage) return null;

  return <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">{children}</div>;
}
