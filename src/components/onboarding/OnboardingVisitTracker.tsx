"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/config";
import type { TrackableOnboardingStep } from "@/lib/onboarding";

export function OnboardingVisitTracker({ step, locale }: { step: TrackableOnboardingStep; locale: Locale }) {
  useEffect(() => {
    const key = `enbilir:onboarding-visit:${step}`;
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");
    void fetch("/api/onboarding/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, locale }),
    });
  }, [locale, step]);

  return null;
}
