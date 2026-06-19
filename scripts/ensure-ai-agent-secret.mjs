import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = resolve(appRoot, ".env");

let contents = "";

try {
  contents = readFileSync(envPath, "utf8");
} catch {
  contents = "";
}

if (/^AI_AGENT_CRON_SECRET=/m.test(contents)) {
  console.log("[ai-agent-secret] AI_AGENT_CRON_SECRET already exists.");
  process.exit(0);
}

const separator = contents.endsWith("\n") || contents.length === 0 ? "" : "\n";
const secret = randomBytes(32).toString("hex");

writeFileSync(envPath, `${contents}${separator}AI_AGENT_CRON_SECRET=${secret}\n`, "utf8");
console.log("[ai-agent-secret] AI_AGENT_CRON_SECRET added.");
