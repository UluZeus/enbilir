import { describe, expect, it } from "vitest";
import {
  canCreateGoogleAccount,
  getGoogleOAuthStartContext,
  hasRequiredLegalConsents,
} from "@/lib/google-oauth-consent";

describe("Google OAuth consent policy", () => {
  it("does not allow login intent to create a new account", () => {
    const context = getGoogleOAuthStartContext(new URLSearchParams({ intent: "login" }));
    expect(context.intent).toBe("login");
    expect(canCreateGoogleAccount(context)).toBe(false);
  });

  it("requires every mandatory declaration for Google registration", () => {
    const incomplete = getGoogleOAuthStartContext(new URLSearchParams({
      intent: "register",
      kvkkAccepted: "on",
      termsAccepted: "on",
    }));
    const complete = getGoogleOAuthStartContext(new URLSearchParams({
      intent: "register",
      kvkkAccepted: "on",
      termsAccepted: "on",
      noAdviceAccepted: "on",
      electronicConsent: "on",
    }));

    expect(canCreateGoogleAccount(incomplete)).toBe(false);
    expect(canCreateGoogleAccount(complete)).toBe(true);
    expect(complete.electronicCommunicationConsent).toBe(true);
  });

  it("recognizes existing users only when all mandatory consents are present", () => {
    expect(hasRequiredLegalConsents({
      kvkkDisclosureAccepted: true,
      termsAccepted: true,
      noInvestmentAdviceAccepted: true,
    })).toBe(true);
    expect(hasRequiredLegalConsents({
      kvkkDisclosureAccepted: true,
      termsAccepted: false,
      noInvestmentAdviceAccepted: true,
    })).toBe(false);
  });
});
