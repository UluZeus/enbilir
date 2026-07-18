export const liveVipSubscriptionClaimStatuses = ["PENDING", "APPROVED"] as const;

export function normalizeVipPaymentProvider(value = "PARAM") {
  return value.trim().toUpperCase().replaceAll(/[^A-Z0-9_-]/g, "").slice(0, 24) || "PARAM";
}

export function normalizeVipPaymentReference(value: string, provider = "PARAM") {
  const normalizedProvider = normalizeVipPaymentProvider(provider);
  const compact = value.trim().replaceAll(/\s+/g, "").toUpperCase();
  const withoutProvider = compact.startsWith(`${normalizedProvider}:`)
    ? compact.slice(normalizedProvider.length + 1)
    : compact;

  return withoutProvider.slice(0, 100);
}

export function canonicalizeVipPaymentReference(value: string, provider = "PARAM") {
  const normalizedProvider = normalizeVipPaymentProvider(provider);
  return `${normalizedProvider}:${normalizeVipPaymentReference(value, normalizedProvider)}`;
}

export function isValidVipPaymentReference(reference: string) {
  return reference.length >= 4 && /^[A-Za-z0-9._/-]+$/.test(reference);
}
