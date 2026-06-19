import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const marker = "# enbilir-ai-agent-cron";
const appDir = "/srv/enbilir/app";
const cronLine = `0 * * * * cd ${appDir} && node scripts/run-ai-agent-cron.mjs >> /var/log/enbilir-ai-agent-cron.log 2>&1 ${marker}`;

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
const tmpPath = join(tmpdir(), `enbilir-ai-agent-cron-${process.pid}`);

writeFileSync(tmpPath, nextCrontab, "utf8");
execFileSync("crontab", [tmpPath], { stdio: "inherit" });
unlinkSync(tmpPath);

console.log(`[ai-agent-cron] installed: ${cronLine}`);
