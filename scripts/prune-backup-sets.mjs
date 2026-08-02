import { lstatSync, readdirSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";

import { isSafeChildPath, loadLocalEnvironment, requireExternalAbsoluteDirectory } from "./lib/operations.mjs";

const backupSetPattern = /^enbilir-\d{8}T\d{6}Z$/;

function getOption(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getRetentionCount() {
  const raw = getOption("--keep") ?? process.env.BACKUP_RETENTION_COUNT ?? "3";
  const count = Number(raw);
  if (!Number.isSafeInteger(count) || count < 2 || count > 60) {
    throw new Error("Backup retention must be a whole number between 2 and 60.");
  }
  return count;
}

loadLocalEnvironment();

const apply = process.argv.includes("--apply");
const keep = getRetentionCount();
const backupRoot = requireExternalAbsoluteDirectory(
  process.env.BACKUP_DIR || path.join(process.cwd(), ".data", "backups"),
  "BACKUP_DIR",
);
const resolvedRoot = realpathSync(backupRoot);
const sets = readdirSync(resolvedRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && backupSetPattern.test(entry.name))
  .map((entry) => {
    const candidatePath = path.join(resolvedRoot, entry.name);
    const resolvedPath = realpathSync(candidatePath);
    if (!isSafeChildPath(resolvedRoot, resolvedPath) || lstatSync(resolvedPath).isSymbolicLink()) {
      throw new Error(`Unsafe backup-set path refused: ${entry.name}`);
    }
    return { name: entry.name, path: resolvedPath };
  })
  .sort((left, right) => right.name.localeCompare(left.name));

if (sets.length <= keep) {
  console.log(`[backup-retention] Keeping all ${sets.length} completed backup set(s).`);
  process.exit(0);
}

const retained = sets.slice(0, keep);
const expired = sets.slice(keep);
console.log(`[backup-retention] Retaining: ${retained.map((set) => set.name).join(", ")}`);
console.log(`[backup-retention] Expiring: ${expired.map((set) => set.name).join(", ")}`);

if (!apply) {
  console.log("[backup-retention] Dry-run complete. Use --apply only after an off-host backup has been verified.");
  process.exit(0);
}

for (const set of expired) {
  if (!isSafeChildPath(resolvedRoot, set.path) || !backupSetPattern.test(set.name)) {
    throw new Error(`Unsafe backup-set deletion refused: ${set.name}`);
  }
  rmSync(set.path, { recursive: true, force: false, maxRetries: 2 });
  console.log(`[backup-retention] Removed ${set.name}.`);
}
