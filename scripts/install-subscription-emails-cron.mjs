import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PRODUCTION_APP_DIRECTORY, PRODUCTION_ENV_FILE } from "./lib/production-paths.mjs";

const marker = "# enbilir-subscription-emails-cron";
const appDir = PRODUCTION_APP_DIRECTORY;
const envFile = PRODUCTION_ENV_FILE;
const cronLine = `10 6 * * * set -a && . ${envFile} && set +a && cd ${appDir} && flock -n /tmp/enbilir-subscription-emails.lock node scripts/run-with-heartbeat.mjs --job subscription-emails --log-dir /var/log/enbilir -- node scripts/run-subscription-emails-cron.mjs ${marker}`;

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
const tmpPath = join(tmpdir(), `enbilir-subscription-emails-cron-${process.pid}`);

writeFileSync(tmpPath, nextCrontab, "utf8");
execFileSync("crontab", [tmpPath], { stdio: "inherit" });
unlinkSync(tmpPath);

console.log(`[subscription-emails-cron] installed: ${cronLine}`);
