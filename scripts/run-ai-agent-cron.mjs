import { readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
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

loadDotEnv();

const secret = process.env.AI_AGENT_CRON_SECRET;

if (!secret) {
  console.error("[ai-agent-cron] AI_AGENT_CRON_SECRET is missing.");
  process.exit(1);
}

const siteUrl = (process.env.AI_AGENT_CRON_ORIGIN || "http://127.0.0.1:3006").replace(/\/$/, "");
const agentUrl = new URL("/api/ai-market/agent/run", siteUrl);
const configuredTimeoutMs = Number(process.env.AI_AGENT_CRON_TIMEOUT_MS);
const requestTimeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 15 * 60 * 1000;

if (process.argv.includes("--force")) {
  agentUrl.searchParams.set("force", "true");
}

function post(url) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      method: "POST",
      headers: { "x-ai-agent-secret": secret },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolveRequest({
          body: Buffer.concat(chunks).toString("utf8"),
          status: response.statusCode ?? 0,
        });
      });
    });

    request.setTimeout(requestTimeoutMs, () => {
      request.destroy(new Error(`Request exceeded ${requestTimeoutMs} ms.`));
    });
    request.on("error", rejectRequest);
    request.end();
  });
}

async function runJob(label, url) {
  try {
    const response = await post(url);

    console.log(`[${label}] ${new Date().toISOString()} ${response.status} ${response.body}`);
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error(`[${label}] ${new Date().toISOString()} request failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

const agentOk = await runJob("ai-agent-cron", agentUrl);
const vipUrl = new URL("/api/vip-research/run", siteUrl);

if (process.argv.includes("--force")) {
  vipUrl.searchParams.set("force", "true");
}

const vipOk = await runJob("vip-research-cron", vipUrl);
const evaluationOk = await runJob("ai-signal-evaluation-cron", new URL("/api/ai-market/evaluate-signals", siteUrl));

if (!agentOk || !vipOk || !evaluationOk) {
  process.exit(1);
}
