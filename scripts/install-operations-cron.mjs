import { execFileSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PRODUCTION_APP_DIRECTORY, PRODUCTION_ENV_FILE } from "./lib/production-paths.mjs";

const marker = "# enbilir-operations-cron";
const appDir = PRODUCTION_APP_DIRECTORY;
const envFile = PRODUCTION_ENV_FILE;
const cronLines = [
  `15 3 * * * set -a && . ${envFile} && set +a && cd ${appDir} && flock -n /tmp/enbilir-backup.lock node scripts/run-with-heartbeat.mjs --job backup --log-dir /var/log/enbilir -- node scripts/backup-with-retention.mjs --apply ${marker}`,
  `45 3 * * * set -a && . ${envFile} && set +a && cd ${appDir} && flock -n /tmp/enbilir-chat-upload-cleanup.lock node scripts/run-with-heartbeat.mjs --job chat-upload-cleanup --log-dir /var/log/enbilir -- node scripts/cleanup-chat-uploads.mjs --apply ${marker}`,
];

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
const nextCrontab = [...existingLines, ...cronLines, ""].join("\n");
const temporaryPath = join(tmpdir(), `enbilir-operations-cron-${process.pid}`);

writeFileSync(temporaryPath, nextCrontab, { encoding: "utf8", mode: 0o600 });
try {
  execFileSync("crontab", [temporaryPath], { stdio: "inherit" });
} finally {
  unlinkSync(temporaryPath);
}
console.log("[operations-cron] Backup and staged-upload cleanup schedules installed.");
