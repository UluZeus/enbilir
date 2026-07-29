import path from "node:path";

export type RuntimeEnvironment = "development" | "test" | "staging" | "production";

export type RuntimeConfigIssue = {
  key: string;
  code:
    | "missing"
    | "invalid"
    | "placeholder"
    | "duplicate-secret"
    | "not-separated"
    | "unsafe-path";
};

const requiredProductionValues = [
  "NEXT_PUBLIC_SITE_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "MASTER_ADMIN_EMAIL",
  "RATE_LIMIT_HASH_SECRET",
  "AI_AGENT_CRON_SECRET",
  "VIP_RESEARCH_CRON_SECRET",
  "VIP_AGENTS_CRON_SECRET",
  "AI_SIGNAL_EVALUATION_CRON_SECRET",
  "SUBSCRIPTION_CRON_SECRET",
  "WEEKLY_COMPETITION_CRON_SECRET",
  "VIP_SUBSCRIPTION_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "OPENAI_API_KEY",
  "CHAT_UPLOAD_DIR",
  "ADMIN_UPLOAD_DIR",
  "BACKUP_DIR",
  "OPERATIONS_LOG_DIR",
] as const;

const requiredProductionOnlyValues = [
  "PARAM_VIP_PAYMENT_URL",
] as const;

const secretKeys = [
  "AUTH_SECRET",
  "RATE_LIMIT_HASH_SECRET",
  "AI_AGENT_CRON_SECRET",
  "VIP_RESEARCH_CRON_SECRET",
  "VIP_AGENTS_CRON_SECRET",
  "AI_SIGNAL_EVALUATION_CRON_SECRET",
  "SUBSCRIPTION_CRON_SECRET",
  "WEEKLY_COMPETITION_CRON_SECRET",
  "VIP_SUBSCRIPTION_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "SMTP_PASSWORD",
  "OPENAI_API_KEY",
] as const;

const minimumLengthSecretKeys = new Set<string>([
  "AUTH_SECRET",
  "RATE_LIMIT_HASH_SECRET",
  "AI_AGENT_CRON_SECRET",
  "VIP_RESEARCH_CRON_SECRET",
  "VIP_AGENTS_CRON_SECRET",
  "AI_SIGNAL_EVALUATION_CRON_SECRET",
  "SUBSCRIPTION_CRON_SECRET",
  "WEEKLY_COMPETITION_CRON_SECRET",
  "VIP_SUBSCRIPTION_WEBHOOK_SECRET",
]);

const storageKeys = ["CHAT_UPLOAD_DIR", "ADMIN_UPLOAD_DIR", "BACKUP_DIR", "OPERATIONS_LOG_DIR"] as const;
const placeholderPattern = /(change[-_ ]?this|replace[-_ ]?me|your[-_ ]|example|dummy|placeholder|test[-_ ]?secret)/i;

export function resolveRuntimeEnvironment(env: NodeJS.ProcessEnv = process.env): RuntimeEnvironment {
  const explicit = env.ENBILIR_ENV?.trim().toLowerCase();
  if (explicit === "production" || explicit === "staging" || explicit === "test" || explicit === "development") {
    return explicit;
  }

  if (env.NODE_ENV === "test") return "test";
  if (env.NODE_ENV === "development") return "development";
  return "production";
}

function isWithin(parentPath: string, candidatePath: string) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function addIssue(issues: RuntimeConfigIssue[], issue: RuntimeConfigIssue) {
  if (!issues.some((candidate) => candidate.key === issue.key && candidate.code === issue.code)) {
    issues.push(issue);
  }
}

export function getRuntimeConfigIssues(
  env: NodeJS.ProcessEnv = process.env,
  appDirectory = process.cwd(),
): RuntimeConfigIssue[] {
  const issues: RuntimeConfigIssue[] = [];
  const runtimeEnvironment = resolveRuntimeEnvironment(env);

  if (env.NODE_ENV === "production" && !env.ENBILIR_ENV) {
    addIssue(issues, { key: "ENBILIR_ENV", code: "missing" });
  }

  if (env.NODE_ENV === "production" && runtimeEnvironment !== "production" && runtimeEnvironment !== "staging") {
    addIssue(issues, { key: "ENBILIR_ENV", code: "not-separated" });
  }

  if (runtimeEnvironment !== "production" && runtimeEnvironment !== "staging") {
    return issues;
  }

  for (const key of requiredProductionValues) {
    if (!env[key]?.trim()) {
      addIssue(issues, { key, code: "missing" });
    }
  }

  if (runtimeEnvironment === "production") {
    for (const key of requiredProductionOnlyValues) {
      if (!env[key]?.trim()) {
        addIssue(issues, { key, code: "missing" });
      }
    }
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol !== "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        addIssue(issues, { key: "NEXT_PUBLIC_SITE_URL", code: "invalid" });
      }
    } catch {
      addIssue(issues, { key: "NEXT_PUBLIC_SITE_URL", code: "invalid" });
    }
  }

  const paramVipPaymentUrl = env.PARAM_VIP_PAYMENT_URL?.trim();
  if (runtimeEnvironment === "production" && paramVipPaymentUrl) {
    try {
      const parsed = new URL(paramVipPaymentUrl);
      if (
        parsed.origin !== "https://isyerim.param.com.tr"
        || parsed.pathname !== "/"
        || parsed.search
        || !/^#\/paymentform\/paymentrequest\/[A-Za-z0-9=_-]{4,256}$/.test(parsed.hash)
      ) {
        addIssue(issues, { key: "PARAM_VIP_PAYMENT_URL", code: "invalid" });
      }
    } catch {
      addIssue(issues, { key: "PARAM_VIP_PAYMENT_URL", code: "invalid" });
    }
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl) {
    if (!databaseUrl.startsWith("file:")) {
      addIssue(issues, { key: "DATABASE_URL", code: "invalid" });
    } else {
      const databasePath = databaseUrl.slice("file:".length);
      if (!path.isAbsolute(databasePath) || /(^|[/\\])dev\.db$/i.test(databasePath) || isWithin(appDirectory, databasePath)) {
        addIssue(issues, { key: "DATABASE_URL", code: "unsafe-path" });
      }
    }
  }

  const masterAdminEmail = env.MASTER_ADMIN_EMAIL?.trim();
  if (masterAdminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(masterAdminEmail)) {
    addIssue(issues, { key: "MASTER_ADMIN_EMAIL", code: "invalid" });
  } else if (masterAdminEmail && /(your-|replace-|@example\.|\.example$)/i.test(masterAdminEmail)) {
    addIssue(issues, { key: "MASTER_ADMIN_EMAIL", code: "placeholder" });
  }

  for (const key of storageKeys) {
    const value = env[key]?.trim();
    if (!value) continue;
    if (!path.isAbsolute(value) || isWithin(appDirectory, value)) {
      addIssue(issues, { key, code: "unsafe-path" });
    }
  }

  if (
    env.CHAT_UPLOAD_DIR &&
    env.ADMIN_UPLOAD_DIR &&
    path.resolve(env.CHAT_UPLOAD_DIR) === path.resolve(env.ADMIN_UPLOAD_DIR)
  ) {
    addIssue(issues, { key: "ADMIN_UPLOAD_DIR", code: "not-separated" });
  }

  const seenSecrets = new Map<string, string>();
  for (const key of secretKeys) {
    const value = env[key]?.trim();
    if (!value) continue;
    if (minimumLengthSecretKeys.has(key) && value.length < 32) {
      addIssue(issues, { key, code: "invalid" });
    }
    if (placeholderPattern.test(value)) {
      addIssue(issues, { key, code: "placeholder" });
    }
    const duplicateKey = seenSecrets.get(value);
    if (duplicateKey) {
      addIssue(issues, { key, code: "duplicate-secret" });
      addIssue(issues, { key: duplicateKey, code: "duplicate-secret" });
    } else {
      seenSecrets.set(value, key);
    }
  }

  return issues;
}

export function assertValidRuntimeConfig(env: NodeJS.ProcessEnv = process.env, appDirectory = process.cwd()) {
  const issues = getRuntimeConfigIssues(env, appDirectory);
  if (issues.length === 0) return;

  const issueSummary = issues.map((issue) => `${issue.key}:${issue.code}`).join(", ");
  throw new Error(`Production runtime configuration is not safe: ${issueSummary}`);
}
