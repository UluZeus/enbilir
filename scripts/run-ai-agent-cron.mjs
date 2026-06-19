import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");

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

loadDotEnv();

const secret = process.env.AI_AGENT_CRON_SECRET;

if (!secret) {
  console.error("[ai-agent-cron] AI_AGENT_CRON_SECRET is missing.");
  process.exit(1);
}

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const url = new URL("/api/ai-market/agent/run", siteUrl);
url.searchParams.set("secret", secret);

if (process.argv.includes("--force")) {
  url.searchParams.set("force", "true");
}

const response = await fetch(url, { method: "POST" });
const body = await response.text();

console.log(`[ai-agent-cron] ${new Date().toISOString()} ${response.status} ${body}`);

if (!response.ok) {
  process.exit(1);
}
