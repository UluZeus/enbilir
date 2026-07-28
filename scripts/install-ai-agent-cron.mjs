import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PRODUCTION_APP_DIRECTORY, PRODUCTION_ENV_FILE } from "./lib/production-paths.mjs";

const marker = "# enbilir-ai-agent-cron";
const appDir = PRODUCTION_APP_DIRECTORY;
const envFile = PRODUCTION_ENV_FILE;
const cronLine = `0 * * * * set -a && . ${envFile} && set +a && cd ${appDir} && flock -n /tmp/enbilir-ai-agent.lock node scripts/run-with-heartbeat.mjs --job ai-agent --log-dir /var/log/enbilir -- node scripts/run-ai-agent-cron.mjs ${marker}`;

function getCurrentCrontab() {
  try {
    return execFileSync("crontab", ["-l"], { encoding: "utf8" });
  } catch (error) {
    if (error?.status === 1 && !String(error?.stdout ?? "").trim() && !String(error?.stderr ?? "").trim()) {
      return "";
    }
    throw new Error(`Mevcut crontab okunamadı; güvenlik için üzerine yazılmadı. ${error instanceof Error ? error.message : error}`);
  }
}

const existingLines = getCurrentCrontab()
  .split(/\r?\n/)
  .map((line) => line.trimEnd())
  .filter((line) => line && !line.includes(marker));

const nextCrontab = [...existingLines, cronLine, ""].join("\n");
const tmpPath = join(tmpdir(), `enbilir-ai-agent-cron-${process.pid}`);

writeFileSync(tmpPath, nextCrontab, "utf8");
execFileSync("crontab", [tmpPath], { stdio: "inherit" });
unlinkSync(tmpPath);

console.log(`[ai-agent-cron] installed: ${cronLine}`);
