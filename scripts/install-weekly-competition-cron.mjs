import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const marker = "# enbilir-weekly-competition-cron";
const appDir = "/srv/enbilir/app";
// The production host uses UTC. 04:10 UTC is 07:10 in Europe/Istanbul.
const cronLine = `10 4 * * 1 cd ${appDir} && node scripts/publish-weekly-competition-results.mjs --apply --confirm-production >> /var/log/enbilir-weekly-competition-cron.log 2>&1 ${marker}`;

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
const tmpPath = join(tmpdir(), `enbilir-weekly-competition-cron-${process.pid}`);

writeFileSync(tmpPath, nextCrontab, "utf8");
execFileSync("crontab", [tmpPath], { stdio: "inherit" });
unlinkSync(tmpPath);

console.log(`[weekly-competition-cron] installed: ${cronLine}`);
