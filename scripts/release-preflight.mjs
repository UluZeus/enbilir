import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

import { createDisposableMysqlDatabase } from "./lib/disposable-mysql.mjs";
import { createMysqlCli } from "./lib/mysql-cli.mjs";
import { loadLocalEnvironment } from "./lib/operations.mjs";

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
run("legacy SQLite source migration upgrade test", npmCommand, [...npmArgumentPrefix, "run", "test:migration-upgrade"]);

const disposableDatabase = createDisposableMysqlDatabase({ purpose: "preflight" });
try {
  const migrationEnvironment = {
    ...process.env,
    ENBILIR_ENV: "test",
    DATABASE_URL: disposableDatabase.databaseUrl,
    MYSQL_DATABASE: disposableDatabase.database,
    MYSQL_DEFAULTS_FILE: disposableDatabase.defaultsFile,
  };
  run("migration deploy against empty disposable MySQL database", npmCommand, [...npmArgumentPrefix, "run", "db:deploy"], {
    env: migrationEnvironment,
  });
  run("idempotent migration redeploy against disposable MySQL database", npmCommand, [...npmArgumentPrefix, "run", "db:deploy"], {
    env: migrationEnvironment,
  });
  const mysql = createMysqlCli({ defaultsFile: disposableDatabase.defaultsFile, database: disposableDatabase.database });
  const completed = Number(mysql.queryScalar(
    "SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
  ));
  const incomplete = Number(mysql.queryScalar(
    "SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL",
  ));
  if (!Number.isSafeInteger(completed) || completed < 1 || incomplete !== 0) {
    throw new Error("Disposable MySQL migration history validation failed.");
  }
} finally {
  disposableDatabase.drop();
}

run("production build", npmCommand, [...npmArgumentPrefix, "run", "build"]);
run("critical end-to-end tests", npmCommand, [...npmArgumentPrefix, "run", "test:e2e"], {
  env: { ...process.env, E2E_USE_EXISTING_BUILD: "true" },
});
console.log("[preflight] All configured gates passed. Artifact creation remains a separate immutable step.");
