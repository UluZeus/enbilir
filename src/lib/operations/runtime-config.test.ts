import { afterEach, describe, expect, it, vi } from "vitest";

import { getRuntimeConfigIssues, resolveRuntimeEnvironment } from "@/lib/operations/runtime-config";

const productionEnv = {
  NODE_ENV: "production",
  ENBILIR_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://enbilir.com",
  DATABASE_URL: "file:/srv/enbilir/data/production.db",
  AUTH_SECRET: "a".repeat(64),
  MASTER_ADMIN_EMAIL: "admin@enbilir.test",
  RATE_LIMIT_HASH_SECRET: "b".repeat(64),
  AI_AGENT_CRON_SECRET: "c".repeat(64),
  VIP_RESEARCH_CRON_SECRET: "d".repeat(64),
  VIP_AGENTS_CRON_SECRET: "e".repeat(64),
  AI_SIGNAL_EVALUATION_CRON_SECRET: "f".repeat(64),
  SUBSCRIPTION_CRON_SECRET: "g".repeat(64),
  WEEKLY_COMPETITION_CRON_SECRET: "h".repeat(64),
  VIP_SUBSCRIPTION_WEBHOOK_SECRET: "i".repeat(64),
  GOOGLE_CLIENT_ID: "synthetic-client-id",
  GOOGLE_CLIENT_SECRET: "j".repeat(40),
  SMTP_HOST: "smtp.example.test",
  SMTP_USER: "no-reply@example.test",
  SMTP_PASSWORD: "k".repeat(40),
  SMTP_FROM: "Enbilir <no-reply@example.test>",
  OPENAI_API_KEY: "synthetic-openai-key-for-tests-only",
  PARAM_VIP_PAYMENT_URL: "https://isyerim.param.com.tr/#/paymentform/paymentrequest/SYNTHETIC_token-123",
  CHAT_UPLOAD_DIR: "/srv/enbilir/uploads/chat",
  ADMIN_UPLOAD_DIR: "/srv/enbilir/uploads/admin",
  BACKUP_DIR: "/srv/enbilir/backups",
  OPERATIONS_LOG_DIR: "/var/log/enbilir",
} satisfies NodeJS.ProcessEnv;

describe("runtime configuration validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires an explicit application environment in production", () => {
    const issues = getRuntimeConfigIssues({ ...productionEnv, ENBILIR_ENV: undefined }, "/srv/enbilir/app");

    expect(issues).toContainEqual(expect.objectContaining({ key: "ENBILIR_ENV" }));
  });

  it("rejects relative, development, and in-repository production storage", () => {
    const issues = getRuntimeConfigIssues(
      {
        ...productionEnv,
        DATABASE_URL: "file:./dev.db",
        CHAT_UPLOAD_DIR: "/srv/enbilir/app/.data/chat",
        BACKUP_DIR: "backups",
      },
      "/srv/enbilir/app",
    );

    expect(issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining(["DATABASE_URL", "CHAT_UPLOAD_DIR", "BACKUP_DIR"]),
    );
  });

  it("rejects reused or placeholder secrets without returning their values", () => {
    const repeated = "change-this-to-a-random-production-secret";
    const issues = getRuntimeConfigIssues(
      {
        ...productionEnv,
        AUTH_SECRET: repeated,
        RATE_LIMIT_HASH_SECRET: repeated,
      },
      "/srv/enbilir/app",
    );

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["placeholder", "duplicate-secret"]),
    );
    expect(JSON.stringify(issues)).not.toContain(repeated);
  });

  it("allows provider-managed credentials with valid shorter formats", () => {
    expect(
      getRuntimeConfigIssues(
        {
          ...productionEnv,
          GOOGLE_CLIENT_SECRET: "provider-secret",
          SMTP_PASSWORD: "mail-password",
          OPENAI_API_KEY: "provider-api-key",
        },
        "/srv/enbilir/app",
      ),
    ).toEqual([]);
  });

  it("accepts a fully separated production configuration", () => {
    expect(getRuntimeConfigIssues(productionEnv, "/srv/enbilir/app")).toEqual([]);
  });

  it("applies the same fail-closed validation to staging deployments", () => {
    const stagingEnv = {
      ...productionEnv,
      ENBILIR_ENV: "staging",
      NEXT_PUBLIC_SITE_URL: "https://staging.enbilir.com",
      DATABASE_URL: "file:/srv/enbilir/data/staging.db",
      CHAT_UPLOAD_DIR: "/srv/enbilir/uploads-staging/chat",
      ADMIN_UPLOAD_DIR: "/srv/enbilir/uploads-staging/admin",
      BACKUP_DIR: "/srv/enbilir/backups-staging",
      OPERATIONS_LOG_DIR: "/var/log/enbilir-staging",
      PARAM_VIP_PAYMENT_URL: undefined,
    };

    expect(getRuntimeConfigIssues(stagingEnv, "/srv/enbilir/app")).toEqual([]);
    expect(
      getRuntimeConfigIssues({ ...stagingEnv, VIP_AGENTS_CRON_SECRET: undefined }, "/srv/enbilir/app"),
    ).toContainEqual({ key: "VIP_AGENTS_CRON_SECRET", code: "missing" });
  });

  it("requires an exact Param VIP payment URL only in production", () => {
    expect(
      getRuntimeConfigIssues(
        { ...productionEnv, PARAM_VIP_PAYMENT_URL: undefined },
        "/srv/enbilir/app",
      ),
    ).toContainEqual({ key: "PARAM_VIP_PAYMENT_URL", code: "missing" });
    expect(
      getRuntimeConfigIssues(
        { ...productionEnv, PARAM_VIP_PAYMENT_URL: "https://example.test/payment" },
        "/srv/enbilir/app",
      ),
    ).toContainEqual({ key: "PARAM_VIP_PAYMENT_URL", code: "invalid" });
  });

  it("fails closed when the production administrator identity is missing or malformed", () => {
    const missing = getRuntimeConfigIssues(
      { ...productionEnv, MASTER_ADMIN_EMAIL: undefined },
      "/srv/enbilir/app",
    );
    const malformed = getRuntimeConfigIssues(
      { ...productionEnv, MASTER_ADMIN_EMAIL: "not-an-email" },
      "/srv/enbilir/app",
    );
    const placeholder = getRuntimeConfigIssues(
      { ...productionEnv, MASTER_ADMIN_EMAIL: "admin@your-domain.example" },
      "/srv/enbilir/app",
    );

    expect(missing).toContainEqual({ key: "MASTER_ADMIN_EMAIL", code: "missing" });
    expect(malformed).toContainEqual({ key: "MASTER_ADMIN_EMAIL", code: "invalid" });
    expect(placeholder).toContainEqual({ key: "MASTER_ADMIN_EMAIL", code: "placeholder" });
  });

  it("maps test and staging explicitly instead of treating them as production", () => {
    expect(resolveRuntimeEnvironment({ NODE_ENV: "test" })).toBe("test");
    expect(resolveRuntimeEnvironment({ NODE_ENV: "production", ENBILIR_ENV: "staging" })).toBe("staging");
  });
});
