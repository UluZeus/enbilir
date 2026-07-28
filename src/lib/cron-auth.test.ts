import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isCronRequestAuthorized } from "@/lib/cron-auth";

describe("cron request authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts only the configured header or bearer secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TEST_CRON_SECRET", "a-secure-dedicated-secret");

    expect(isCronRequestAuthorized(new Request("https://example.com/run?secret=a-secure-dedicated-secret"), {
      envName: "TEST_CRON_SECRET",
      headerName: "x-test-cron-secret",
    })).toBe(false);
    expect(isCronRequestAuthorized(new Request("https://example.com/run", {
      headers: { "x-test-cron-secret": "a-secure-dedicated-secret" },
    }), {
      envName: "TEST_CRON_SECRET",
      headerName: "x-test-cron-secret",
    })).toBe(true);
    expect(isCronRequestAuthorized(new Request("https://example.com/run", {
      headers: { authorization: "Bearer a-secure-dedicated-secret" },
    }), {
      envName: "TEST_CRON_SECRET",
    })).toBe(true);
  });

  it("fails closed without a secret unless explicit local cron mode is enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TEST_CRON_SECRET", "");
    vi.stubEnv("ALLOW_INSECURE_LOCAL_CRON", "");

    const request = new Request("http://localhost/run");
    expect(isCronRequestAuthorized(request, { envName: "TEST_CRON_SECRET" })).toBe(false);

    vi.stubEnv("ALLOW_INSECURE_LOCAL_CRON", "true");
    expect(isCronRequestAuthorized(request, { envName: "TEST_CRON_SECRET" })).toBe(true);
  });
});
