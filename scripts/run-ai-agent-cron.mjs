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

const secrets = {
  ai: process.env.AI_AGENT_CRON_SECRET,
  vipResearch: process.env.VIP_RESEARCH_CRON_SECRET,
  vipAgents: process.env.VIP_AGENTS_CRON_SECRET,
  signalEvaluation: process.env.AI_SIGNAL_EVALUATION_CRON_SECRET,
};

const missingSecrets = Object.entries(secrets).filter(([, value]) => !value).map(([key]) => key);
if (missingSecrets.length > 0) {
  console.error(`[ai-agent-cron] Dedicated cron secrets are missing: ${missingSecrets.join(", ")}.`);
  process.exit(1);
}

const siteUrl = (process.env.AI_AGENT_CRON_ORIGIN || "http://127.0.0.1:3006").replace(/\/$/, "");
const agentUrl = new URL("/api/ai-market/agent/run", siteUrl);
const configuredTimeoutMs = Number(process.env.AI_AGENT_CRON_TIMEOUT_MS);
const requestTimeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 15 * 60 * 1000;

if (process.argv.includes("--force")) {
  agentUrl.searchParams.set("force", "true");
}

function post(url, headerName, secret) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      method: "POST",
      headers: { [headerName]: secret },
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

async function runJob(label, url, headerName, secret) {
  try {
    const response = await post(url, headerName, secret);

    console.log(`[${label}] ${new Date().toISOString()} ${response.status} ${response.body}`);
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error(`[${label}] ${new Date().toISOString()} request failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

const agentOk = await runJob("ai-agent-cron", agentUrl, "x-ai-agent-secret", secrets.ai);
const vipUrl = new URL("/api/vip-research/run", siteUrl);

if (process.argv.includes("--force")) {
  vipUrl.searchParams.set("force", "true");
}

const vipOk = await runJob("vip-research-cron", vipUrl, "x-vip-research-cron-secret", secrets.vipResearch);
const vipAgentsOk = await runJob(
  "vip-agents-cron",
  new URL("/api/vip-agents/run", siteUrl),
  "x-vip-agents-cron-secret",
  secrets.vipAgents,
);
const evaluationOk = await runJob(
  "ai-signal-evaluation-cron",
  new URL("/api/ai-market/evaluate-signals", siteUrl),
  "x-ai-signal-evaluation-secret",
  secrets.signalEvaluation,
);

if (!agentOk || !vipOk || !vipAgentsOk || !evaluationOk) {
  process.exit(1);
}
