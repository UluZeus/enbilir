import { describe, expect, it } from "vitest";
import {
  resolveVipResearchTestRecipient,
  VIP_RESEARCH_TEST_RECIPIENT,
} from "@/lib/vip-research/test-recipient";

describe("VIP research test recipient guard", () => {
  it("allows only the configured master admin address", () => {
    expect(resolveVipResearchTestRecipient(` ${VIP_RESEARCH_TEST_RECIPIENT.toUpperCase()} `)).toEqual({
      email: VIP_RESEARCH_TEST_RECIPIENT,
      name: "Hakan Bey",
    });
  });

  it("rejects missing or different recipients", () => {
    expect(() => resolveVipResearchTestRecipient(undefined)).toThrow("MASTER_ADMIN_EMAIL");
    expect(() => resolveVipResearchTestRecipient("someone@example.com")).toThrow("MASTER_ADMIN_EMAIL");
  });
});
