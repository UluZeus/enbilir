import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function loadDotEnv() {
  const envPath = resolve(appRoot, ".env");

  try {
    const contents = readFileSync(envPath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Production cron runs from the app folder; missing .env should surface as a missing secret below.
  }
}

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));

  return match ? match.slice(prefix.length) : null;
}

loadDotEnv();

const secret = process.env.SUBSCRIPTION_CRON_SECRET ?? process.env.AI_AGENT_CRON_SECRET;

if (!secret) {
  console.error("[subscription-emails-cron] SUBSCRIPTION_CRON_SECRET or AI_AGENT_CRON_SECRET is missing.");
  process.exit(1);
}

const siteUrl = (process.env.SUBSCRIPTION_CRON_ORIGIN || process.env.AI_AGENT_CRON_ORIGIN || "http://127.0.0.1:3006").replace(/\/$/, "");
const url = new URL("/api/subscription/reminders/run", siteUrl);
url.searchParams.set("secret", secret);

if (process.argv.includes("--dry-run")) {
  url.searchParams.set("dryRun", "true");
}

const testEmail = getArgValue("test-email");

if (testEmail) {
  url.searchParams.set("testEmail", testEmail);
}

const limit = getArgValue("limit");

if (limit) {
  url.searchParams.set("limit", limit);
}

const response = await fetch(url, { method: "POST" });
const body = await response.text();

console.log(`[subscription-emails-cron] ${new Date().toISOString()} ${response.status} ${body}`);

if (!response.ok) {
  process.exit(1);
}
