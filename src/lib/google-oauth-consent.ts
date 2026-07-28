export type GoogleOAuthIntent = "login" | "register";

export type GoogleOAuthStartContext = {
  intent: GoogleOAuthIntent;
  kvkkDisclosureAccepted: boolean;
  termsAccepted: boolean;
  noInvestmentAdviceAccepted: boolean;
  electronicCommunicationConsent: boolean;
};

type RequiredLegalConsentSnapshot = Pick<
  GoogleOAuthStartContext,
  "kvkkDisclosureAccepted" | "termsAccepted" | "noInvestmentAdviceAccepted"
>;

function isAccepted(value: string | null) {
  return value === "on" || value === "accepted" || value === "true";
}

export function getGoogleOAuthStartContext(searchParams: URLSearchParams): GoogleOAuthStartContext {
  return {
    intent: searchParams.get("intent") === "register" ? "register" : "login",
    kvkkDisclosureAccepted: isAccepted(searchParams.get("kvkkAccepted")),
    termsAccepted: isAccepted(searchParams.get("termsAccepted")),
    noInvestmentAdviceAccepted: isAccepted(searchParams.get("noAdviceAccepted")),
    electronicCommunicationConsent: isAccepted(searchParams.get("electronicConsent")),
  };
}

export function hasRequiredLegalConsents(consents: RequiredLegalConsentSnapshot) {
  return consents.kvkkDisclosureAccepted
    && consents.termsAccepted
    && consents.noInvestmentAdviceAccepted;
}

export function canCreateGoogleAccount(context: GoogleOAuthStartContext) {
  return context.intent === "register" && hasRequiredLegalConsents(context);
}
