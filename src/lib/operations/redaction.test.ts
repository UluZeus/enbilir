import { describe, expect, it } from "vitest";

import { redactOperationalText } from "@/lib/operations/redaction";

describe("operational log redaction", () => {
  it("removes bearer tokens, secret query values, API keys, JWTs, and email addresses", () => {
    const input = [
      "Authorization: Bearer top-secret-token",
      "https://example.test/run?secret=my-secret-value&limit=5",
      "OPENAI_API_KEY=sk-test-secret-value",
      "jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
      "customer@example.test",
    ].join(" ");

    const output = redactOperationalText(input);

    expect(output).not.toContain("top-secret-token");
    expect(output).not.toContain("my-secret-value");
    expect(output).not.toContain("sk-test-secret-value");
    expect(output).not.toContain("eyJhbGci");
    expect(output).not.toContain("customer@example.test");
    expect(output).toContain("[REDACTED]");
  });

  it("caps untrusted response bodies before they reach cron logs", () => {
    expect(redactOperationalText("x".repeat(10_000), 200)).toHaveLength(200);
  });
});
