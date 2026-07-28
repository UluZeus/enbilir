import { readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

try {
  const contents = readFileSync(resolve(appRoot, ".env"), "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // Missing environment is reported as a missing dedicated secret below.
}

const secret = process.env.WEEKLY_COMPETITION_CRON_SECRET;
if (!secret) {
  console.error("[weekly-competition-cron] WEEKLY_COMPETITION_CRON_SECRET is missing.");
  process.exit(1);
}

const siteUrl = (process.env.WEEKLY_COMPETITION_CRON_ORIGIN || "http://127.0.0.1:3006").replace(/\/$/, "");
const url = new URL("/api/competition/weekly/run", siteUrl);
const requestFn = url.protocol === "https:" ? httpsRequest : httpRequest;

const result = await new Promise((resolveResult, rejectResult) => {
  const request = requestFn(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  }, (response) => {
    const chunks = [];
    response.on("data", (chunk) => chunks.push(chunk));
    response.on("end", () => resolveResult({
      status: response.statusCode ?? 0,
      body: Buffer.concat(chunks).toString("utf8"),
    }));
  });
  request.setTimeout(10 * 60 * 1000, () => request.destroy(new Error("Weekly publication timed out.")));
  request.on("error", rejectResult);
  request.end();
});

console.log(`[weekly-competition-cron] ${new Date().toISOString()} ${result.status} ${result.body}`);
if (result.status < 200 || result.status >= 300) process.exit(1);
