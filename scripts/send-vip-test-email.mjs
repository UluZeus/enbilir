import { readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

try {
  const contents = readFileSync(resolve(appRoot, ".env"), "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  // Missing configuration is reported below without exposing secrets.
}

const secret = process.env.AI_AGENT_CRON_SECRET;
if (!secret) {
  console.error("[vip-test-email] AI_AGENT_CRON_SECRET is missing.");
  process.exit(1);
}

const origin = (process.env.AI_AGENT_CRON_ORIGIN || "http://127.0.0.1:3006").replace(/\/$/, "");
const url = new URL("/api/vip-research/test-email", origin);
if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
  console.error("[vip-test-email] Test endpoint must use localhost HTTP.");
  process.exit(1);
}

const response = await new Promise((resolveRequest, rejectRequest) => {
  const request = httpRequest(url, {
    method: "POST",
    headers: { "x-ai-agent-secret": secret },
  }, (incoming) => {
    const chunks = [];
    incoming.on("data", (chunk) => chunks.push(chunk));
    incoming.on("end", () => resolveRequest({
      status: incoming.statusCode ?? 0,
      body: Buffer.concat(chunks).toString("utf8"),
    }));
  });
  request.setTimeout(120_000, () => request.destroy(new Error("VIP test e-postası zaman aşımına uğradı.")));
  request.on("error", rejectRequest);
  request.end();
});

console.log(`[vip-test-email] ${response.status} ${response.body}`);
if (response.status < 200 || response.status >= 300) process.exit(1);
