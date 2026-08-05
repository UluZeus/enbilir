#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function requireSafeToken(value, label) {
  if (!/^[A-Za-z0-9_.-]+$/.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function resolveChild(argv) {
  const separator = argv.indexOf("--");
  const child = separator >= 0 ? argv.slice(separator + 1) : [];
  if (child.length < 1) throw new Error("Provide a child command after --.");
  if (process.platform === "win32" && (child[0] === "npm" || child[0] === "npx")) {
    return {
      command: process.execPath,
      args: [
        path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", `${child[0]}-cli.js`),
        ...child.slice(1),
      ],
    };
  }
  return { command: child[0], args: child.slice(1) };
}

export function buildProvisionSql(username, accountHost, password) {
  requireSafeToken(username, "Generated MySQL username");
  if (!/^(?:localhost|127\.0\.0\.1)$/.test(accountHost)) throw new Error("MYSQL_LOCAL_HOST is invalid.");
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(password)) throw new Error("Generated MySQL password is invalid.");
  return `CREATE USER '${username}'@'${accountHost}' IDENTIFIED BY '${password}';\nGRANT ALL PRIVILEGES ON \`\\_enbilir\\_%\`.* TO '${username}'@'${accountHost}';`;
}

export function runLocalMysqlWrapper({
  argv = process.argv.slice(2),
  env = process.env,
  spawnSyncOperation = spawnSync,
} = {}) {
  const explicitEnvironment = env.ENBILIR_ENV?.trim().toLowerCase();
  if (explicitEnvironment === "production" || (!explicitEnvironment && env.NODE_ENV === "production")) {
    throw new Error("The local MySQL wrapper refuses production runtime.");
  }
  const loginPath = requireSafeToken(env.MYSQL_ADMIN_LOGIN_PATH || "enbilir-local", "MYSQL_ADMIN_LOGIN_PATH");
  const host = env.MYSQL_LOCAL_HOST || "localhost";
  if (!/^(?:localhost|127\.0\.0\.1)$/.test(host)) throw new Error("MYSQL_LOCAL_HOST is invalid.");
  const port = Number(env.MYSQL_LOCAL_PORT || 3306);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("MYSQL_LOCAL_PORT is invalid.");
  const child = resolveChild(argv);
  const username = `enbilir_test_${randomBytes(6).toString("hex")}`;
  const password = randomBytes(32).toString("base64url");
  const mysql = env.MYSQL_BINARY || "mysql";
  const adminArguments = [`--login-path=${loginPath}`, "--batch", "--skip-column-names"];
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "enbilir-local-mysql-"));
  const defaultsFile = path.join(temporaryRoot, "client.cnf");
  let provisionAttempted = false;
  try {
    provisionAttempted = true;
    const provision = spawnSyncOperation(mysql, adminArguments, {
      cwd: process.cwd(), env, encoding: "utf8", input: buildProvisionSql(username, host, password), maxBuffer: 1024 * 1024,
    });
    if (provision.error || provision.status !== 0) throw new Error("Local MySQL test-account provisioning failed; details were withheld.");
    writeFileSync(defaultsFile, `[client]\nuser=${username}\npassword=${password}\nhost=${host}\nport=${port}\nprotocol=tcp\n`, {
      encoding: "utf8", mode: 0o600, flag: "wx",
    });
    if (process.platform !== "win32") chmodSync(defaultsFile, 0o600);
    const childEnvironment = {
      ...env,
      ENBILIR_ENV: "test",
      NODE_ENV: "test",
      MYSQL_ALLOW_DISPOSABLE_DATABASES: "1",
      MYSQL_DEFAULTS_FILE: defaultsFile,
      MYSQL_TEST_DATABASE_URL: `mysql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/mysql`,
    };
    const result = spawnSyncOperation(child.command, child.args, {
      cwd: process.cwd(), env: childEnvironment, stdio: "inherit", shell: false,
    });
    if (result.error) throw new Error("Local MySQL child command could not start.");
    return result.status ?? 1;
  } finally {
    let cleanupFailed = false;
    if (provisionAttempted) {
      const cleanup = spawnSyncOperation(mysql, adminArguments, {
        cwd: process.cwd(), env, encoding: "utf8",
        input: `DROP USER IF EXISTS '${username}'@'${host}';`, maxBuffer: 1024 * 1024,
      });
      cleanupFailed = Boolean(cleanup.error || cleanup.status !== 0);
    }
    rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (cleanupFailed) throw new Error("Local MySQL test-account cleanup failed; details were withheld.");
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    process.exitCode = runLocalMysqlWrapper();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Local MySQL wrapper failed.");
    process.exitCode = 1;
  }
}
