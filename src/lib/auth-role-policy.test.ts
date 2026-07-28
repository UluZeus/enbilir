import { describe, expect, it } from "vitest";

import { getSelfServiceRegistrationDefaults } from "@/lib/auth-role-policy";

describe("self-service auth role policy", () => {
  it("never elevates a password or OAuth registration from an email address", () => {
    expect(getSelfServiceRegistrationDefaults("admin@example.test")).toEqual({
      role: "USER",
      nickname: null,
      displayNameMode: "REAL_NAME",
    });
    expect(getSelfServiceRegistrationDefaults("hakan@ultraakil.com")).toEqual({
      role: "USER",
      nickname: null,
      displayNameMode: "REAL_NAME",
    });
  });
});
