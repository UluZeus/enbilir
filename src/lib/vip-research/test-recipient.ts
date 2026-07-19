export const VIP_RESEARCH_TEST_RECIPIENT = "hakan@ultraakil.com";

export function resolveVipResearchTestRecipient(configuredEmail: string | undefined) {
  const normalized = configuredEmail?.trim().toLowerCase();

  if (normalized !== VIP_RESEARCH_TEST_RECIPIENT) {
    throw new Error("MASTER_ADMIN_EMAIL, izin verilen VIP test alıcısıyla eşleşmiyor.");
  }

  return {
    email: VIP_RESEARCH_TEST_RECIPIENT,
    name: "Hakan Bey",
  };
}
