import { describe, expect, it } from "vitest";
import { publicCompetitionUserWhere } from "@/lib/public-user-visibility";

describe("public competition user visibility", () => {
  it("requires both an active account and a verified email", () => {
    expect(publicCompetitionUserWhere).toEqual({
      isActive: true,
      emailVerifiedAt: { not: null },
    });
  });
});
