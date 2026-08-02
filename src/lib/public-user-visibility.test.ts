import { describe, expect, it } from "vitest";
import {
  getSafePublicUserLabel,
  publicCompetitionUserWhere,
} from "@/lib/public-user-visibility";

describe("public competition user visibility", () => {
  it("requires both an active account and a verified email", () => {
    expect(publicCompetitionUserWhere).toEqual({
      isActive: true,
      emailVerifiedAt: { not: null },
    });
  });

  it("returns only the trimmed label selected by the user's display mode", () => {
    expect(getSafePublicUserLabel("  Ada Lovelace  ", "hidden.nick@example.test", "REAL_NAME"))
      .toBe("Ada Lovelace");
    expect(getSafePublicUserLabel("hidden.name@example.test", "  Market Ada  ", "NICKNAME"))
      .toBe("Market Ada");
  });

  it("returns null for a blank or email-shaped selected label without exposing the alternate", () => {
    expect(getSafePublicUserLabel("private.real@example.test", "Safe Nick", "REAL_NAME"))
      .toBeNull();
    expect(getSafePublicUserLabel("Safe Name", "private.nick@example.test", "NICKNAME"))
      .toBeNull();
    expect(getSafePublicUserLabel("local@machine", "Safe Nick", "REAL_NAME")).toBeNull();
    expect(getSafePublicUserLabel("Safe Name", "   ", "NICKNAME")).toBeNull();
    expect(getSafePublicUserLabel("   ", "Safe Nick", "REAL_NAME")).toBeNull();
  });

  it("uses the stored email only to reject an equivalent email or local-part label", () => {
    expect(getSafePublicUserLabel(
      "  Synthetic.Member@Example.Test  ",
      "Hidden Nick",
      "REAL_NAME",
      "synthetic.member@example.test",
    )).toBeNull();
    expect(getSafePublicUserLabel(
      "Hidden Name",
      "  SYNTHETIC.MEMBER  ",
      "NICKNAME",
      "synthetic.member@example.test",
    )).toBeNull();
    expect(getSafePublicUserLabel(
      "Synthetic Member",
      "Hidden Nick",
      "REAL_NAME",
      "synthetic.member@example.test",
    )).toBe("Synthetic Member");
  });

  it("does not let changes to the hidden alternate affect the public label", () => {
    expect(getSafePublicUserLabel("Public Name", "First Hidden Nick", "REAL_NAME"))
      .toBe(getSafePublicUserLabel("Public Name", "Second Hidden Nick", "REAL_NAME"));
    expect(getSafePublicUserLabel("First Hidden Name", "Public Nick", "NICKNAME"))
      .toBe(getSafePublicUserLabel("Second Hidden Name", "Public Nick", "NICKNAME"));
  });
});
