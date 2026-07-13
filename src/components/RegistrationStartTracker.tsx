"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/config";

export function RegistrationStartTracker({ locale }: { locale: Locale }) {
  useEffect(() => {
    const key = "enbilir:registration-started";
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");
    void fetch("/api/analytics/registration-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, sessionKey: crypto.randomUUID() }),
    });
  }, [locale]);
  return null;
}
