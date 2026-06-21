import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const marker = "# enbilir-subscription-emails-cron";
const appDir = "/srv/enbilir/app";
const cronLine = `10 6 * * * cd ${appDir} && node scripts/run-subscription-emails-cron.mjs >> /var/log/enbilir-subscription-emails-cron.log 2>&1 ${marker}`;

function getCurrentCrontab() {
  try {
    return execFileSync("crontab", ["-l"], { encoding: "utf8" });
  } catch {
    return "";
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
