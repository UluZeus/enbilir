import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

import { buildMysqlArguments, requireMysqlDefaultsFile } from "./mysql-cli.mjs";

const SAFE_PREFIX = /^_enbilir_(?:test|e2e|preflight)_[a-z0-9_]*$/;

export function deriveDisposableDatabaseUrl(baseUrl, databaseName) {
  if (!SAFE_PREFIX.test(databaseName)) throw new Error("Disposable database name is unsafe.");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "mysql:" || !parsed.hostname || !parsed.username) {
    throw new Error("MYSQL_TEST_DATABASE_URL must be a complete mysql: URL.");
  }
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

export function resolveDisposableMysqlOptions(env = process.env, purpose = "test") {
  const explicitEnvironment = env.ENBILIR_ENV?.trim().toLowerCase();
  if (explicitEnvironment === "production" || (!explicitEnvironment && env.NODE_ENV === "production")) {
    throw new Error("Disposable MySQL databases are refused in production runtime.");
  }
  if (env.MYSQL_ALLOW_DISPOSABLE_DATABASES !== "1") {
    throw new Error("MYSQL_ALLOW_DISPOSABLE_DATABASES=1 is required for disposable MySQL tests.");
  }
  const baseUrl = env.MYSQL_TEST_DATABASE_URL?.trim();
  if (!baseUrl) throw new Error("MYSQL_TEST_DATABASE_URL is required.");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "mysql:" || !parsed.hostname || !parsed.username) {
    throw new Error("MYSQL_TEST_DATABASE_URL must be a complete mysql: URL.");
  }
  if (env.DATABASE_URL && env.DATABASE_URL === baseUrl) {
    throw new Error("MYSQL_TEST_DATABASE_URL must not equal DATABASE_URL.");
  }
  const normalizedPurpose = String(purpose).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (!/^(?:test|e2e|preflight)$/.test(normalizedPurpose)) throw new Error("Disposable MySQL purpose is invalid.");
  return {
    baseUrl,
    defaultsFile: env.MYSQL_DEFAULTS_FILE,
    executable: env.MYSQL_BINARY || "mysql",
    purpose: normalizedPurpose,
  };
}

function serverSql(options, sql) {
  const defaultsFile = requireMysqlDefaultsFile(options.defaultsFile);
  const result = spawnSync(options.executable, buildMysqlArguments({
    defaultsFile,
    database: "unused",
    includeDatabase: false,
  }), {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    input: sql,
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error("Disposable MySQL administration failed; provider details were withheld.");
  }
}

export function createDisposableMysqlDatabase({ env = process.env, purpose = "test" } = {}) {
  const options = resolveDisposableMysqlOptions(env, purpose);
  const database = `_enbilir_${options.purpose}_${Date.now()}_${randomBytes(5).toString("hex")}`;
  if (!SAFE_PREFIX.test(database)) throw new Error("Generated disposable database name is unsafe.");
  serverSql(options, `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`);
  let dropped = false;
  return {
    database,
    databaseUrl: deriveDisposableDatabaseUrl(options.baseUrl, database),
    defaultsFile: options.defaultsFile,
    drop() {
      if (dropped) return;
      serverSql(options, `DROP DATABASE \`${database}\`;`);
      dropped = true;
    },
  };
}

export function canUseDisposableMysql(env = process.env) {
  try {
    resolveDisposableMysqlOptions(env);
    requireMysqlDefaultsFile(env.MYSQL_DEFAULTS_FILE);
    return true;
  } catch {
    return false;
  }
}
