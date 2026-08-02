import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const backupResult = spawnSync(process.execPath, [path.join(scriptRoot, "backup-sqlite.mjs"), ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (backupResult.error) throw backupResult.error;
if (backupResult.status !== 0) {
  process.exitCode = backupResult.status ?? 1;
} else {
  const retentionResult = spawnSync(process.execPath, [path.join(scriptRoot, "prune-backup-sets.mjs"), ...process.argv.slice(2)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (retentionResult.error) throw retentionResult.error;
  process.exitCode = retentionResult.status ?? 1;
}
