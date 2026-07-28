import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { getSqliteDatabasePath, loadLocalEnvironment } from "./lib/operations.mjs";

const npmCommand = process.platform === "win32" ? process.execPath : "npm";
const npmArgumentPrefix =
  process.platform === "win32"
    ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
    : [];
const npxCommand = process.platform === "win32" ? process.execPath : "npx";
const npxArgumentPrefix =
  process.platform === "win32"
    ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js")]
    : [];

function run(label, command, args, options = {}) {
  console.log(`[preflight] ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: options.env || process.env,
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) throw new Error(`${label} failed.`);
}

loadLocalEnvironment();
const nodeVersion = process.versions.node.split(".").map(Number);
if (nodeVersion[0] < 20 || (nodeVersion[0] === 20 && nodeVersion[1] < 9)) {
  throw new Error("Node.js 20.9 or newer is required.");
}
const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
if (dirty) throw new Error("Release preflight requires a clean working tree.");

const packageJson = JSON.parse(
  execFileSync(process.execPath, ["-e", "process.stdout.write(require('fs').readFileSync('package.json','utf8'))"], {
    encoding: "utf8",
  }),
);
for (const requiredScript of ["test:integration", "test:e2e"]) {
  if (!packageJson.scripts?.[requiredScript]) {
    throw new Error(`Required release gate ${requiredScript} is unavailable.`);
  }
}

run("tracked-secret scan", process.execPath, ["scripts/scan-secrets.mjs"]);
run("environment file permission check", process.execPath, ["scripts/check-env-permissions.mjs"]);
run("dependency security audit", npmCommand, [...npmArgumentPrefix, "audit", "--audit-level=high"]);
run("lint", npmCommand, [...npmArgumentPrefix, "run", "lint"]);
run("TypeScript", npxCommand, [...npxArgumentPrefix, "tsc", "--noEmit", "--incremental", "false"]);
run("unit tests", npmCommand, [...npmArgumentPrefix, "run", "test"]);
run("integration tests", npmCommand, [...npmArgumentPrefix, "run", "test:integration"]);
run("legacy database migration upgrade test", npmCommand, [...npmArgumentPrefix, "run", "test:migration-upgrade"]);

const migrationDirectory = mkdtempSync(path.join(tmpdir(), "enbilir-migration-clone-"));
try {
  const clonePath = path.join(migrationDirectory, "migration-clone.db");
  const source = new Database(getSqliteDatabasePath(), { readonly: true, fileMustExist: true });
  await source.backup(clonePath);
  source.close();
  run("migration deploy against disposable database clone", npmCommand, [...npmArgumentPrefix, "run", "db:deploy"], {
    env: { ...process.env, DATABASE_URL: `file:${clonePath}` },
  });
  const migrated = new Database(clonePath, { readonly: true, fileMustExist: true });
  const integrity = migrated.pragma("integrity_check");
  migrated.close();
  if (
    integrity.length !== 1 ||
    String(integrity[0]?.integrity_check || integrity[0]?.["integrity_check"]).toLowerCase() !== "ok"
  ) {
    throw new Error("Disposable migration clone failed SQLite integrity_check.");
  }
} finally {
  rmSync(migrationDirectory, { recursive: true, force: true });
}

run("production build", npmCommand, [...npmArgumentPrefix, "run", "build"]);
run("critical end-to-end tests", npmCommand, [...npmArgumentPrefix, "run", "test:e2e"], {
  env: { ...process.env, E2E_USE_EXISTING_BUILD: "true" },
});
console.log("[preflight] All configured gates passed. Artifact creation remains a separate immutable step.");
