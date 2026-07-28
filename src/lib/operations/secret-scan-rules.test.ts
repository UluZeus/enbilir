import { describe, expect, it } from "vitest";

import {
  findPotentialSecretRules,
  shouldScanRepositoryFile,
} from "../../../scripts/lib/secret-scan-rules.mjs";

describe("repository secret scan rules", () => {
  it("scans the committed environment template without treating documented placeholders as secrets", () => {
    expect(shouldScanRepositoryFile(".env.example")).toBe(true);
    expect(findPotentialSecretRules('AUTH_SECRET="change-this-to-a-random-64-character-production-secret"')).toEqual([]);
    expect(findPotentialSecretRules('SMTP_PASSWORD="your-smtp-password"')).toEqual([]);
  });

  it("detects realistic credentials in the environment template and source files", () => {
    const providerCredential = ["sk", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
    const assignedSecret = ["AUTH", '_SECRET="', "p4Ssw0rd-actual-value-1234567890", '"'].join("");
    expect(findPotentialSecretRules(`OPENAI_API_KEY="${providerCredential}"`)).toContain("openai-key");
    expect(findPotentialSecretRules(assignedSecret)).toContain("literal-secret-assignment");
  });
});
