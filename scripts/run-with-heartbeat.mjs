import { spawn } from "node:child_process";
import { appendFileSync, chmodSync, closeSync, existsSync, mkdirSync, openSync, renameSync, statSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import {
  getSqliteDatabasePath,
  loadLocalEnvironment,
  redactOperationalText,
  requireExternalAbsoluteDirectory,
} from "./lib/operations.mjs";
import { parseRunWithHeartbeatArguments } from "./lib/run-with-heartbeat-arguments.mjs";

function rotateLog(logPath, maxBytes, copies = 5) {
  if (!existsSync(logPath) || statSync(logPath).size < maxBytes) return;
  for (let index = copies - 1; index >= 1; index -= 1) {
    const source = `${logPath}.${index}`;
    if (existsSync(source)) renameSync(source, `${logPath}.${index + 1}`);
  }
  renameSync(logPath, `${logPath}.1`);
}

function updateHeartbeat(database, jobKey, state, errorMessage = null) {
  const now = new Date().toISOString();
  const columns =
    state === "started"
      ? { lastStartedAt: now, lastSucceededAt: null, lastFailedAt: null, lastError: null }
      : state === "succeeded"
        ? { lastStartedAt: null, lastSucceededAt: now, lastFailedAt: null, lastError: null }
        : { lastStartedAt: null, lastSucceededAt: null, lastFailedAt: now, lastError: errorMessage };
  database
    .prepare(
      `INSERT INTO OperationalJobHeartbeat
        (jobKey, lastStartedAt, lastSucceededAt, lastFailedAt, lastError, metadata, updatedAt)
       VALUES (@jobKey, @lastStartedAt, @lastSucceededAt, @lastFailedAt, @lastError, '{}', @updatedAt)
       ON CONFLICT(jobKey) DO UPDATE SET
         lastStartedAt = COALESCE(excluded.lastStartedAt, OperationalJobHeartbeat.lastStartedAt),
         lastSucceededAt = COALESCE(excluded.lastSucceededAt, OperationalJobHeartbeat.lastSucceededAt),
         lastFailedAt = COALESCE(excluded.lastFailedAt, OperationalJobHeartbeat.lastFailedAt),
         lastError = excluded.lastError,
         updatedAt = excluded.updatedAt`,
    )
    .run({ jobKey, ...columns, updatedAt: now });
}

loadLocalEnvironment();
const options = parseRunWithHeartbeatArguments(process.argv.slice(2));
const configuredLogDirectory =
  options.logDirectory ||
  process.env.OPERATIONS_LOG_DIR ||
  (process.env.NODE_ENV === "production" ? undefined : path.join(process.cwd(), ".data", "logs"));
const logDirectory = requireExternalAbsoluteDirectory(configuredLogDirectory, "OPERATIONS_LOG_DIR");
mkdirSync(logDirectory, { recursive: true, mode: 0o750 });
const logPath = path.join(logDirectory, `${options.jobKey}.log`);
rotateLog(logPath, options.maxBytes);
closeSync(openSync(logPath, "a", 0o640));
if (process.platform !== "win32") chmodSync(logPath, 0o640);

const database = new Database(getSqliteDatabasePath());
database.pragma("foreign_keys = ON");
updateHeartbeat(database, options.jobKey, "started");

const writeLine = (stream, value) => {
  const line = `${new Date().toISOString()} ${stream} ${redactOperationalText(value)}\n`;
  appendFileSync(logPath, line, { encoding: "utf8", mode: 0o640 });
  if (stream === "stderr") process.stderr.write(line);
  else process.stdout.write(line);
};

let stdoutBuffer = "";
let stderrBuffer = "";
const child = spawn(options.command, options.commandArguments, {
  cwd: process.cwd(),
  env: process.env,
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  stdoutBuffer += chunk;
  const lines = stdoutBuffer.split(/\r?\n/);
  stdoutBuffer = lines.pop() || "";
  for (const line of lines) writeLine("stdout", line);
});
child.stderr.on("data", (chunk) => {
  stderrBuffer += chunk;
  const lines = stderrBuffer.split(/\r?\n/);
  stderrBuffer = lines.pop() || "";
  for (const line of lines) writeLine("stderr", line);
});

const exitCode = await new Promise((resolve) => {
  child.once("error", (error) => {
    writeLine("stderr", error);
    resolve(1);
  });
  child.once("close", (code) => resolve(code ?? 1));
});
if (stdoutBuffer) writeLine("stdout", stdoutBuffer);
if (stderrBuffer) writeLine("stderr", stderrBuffer);

if (exitCode === 0) {
  updateHeartbeat(database, options.jobKey, "succeeded");
} else {
  updateHeartbeat(database, options.jobKey, "failed", `Process exited with code ${exitCode}.`);
}
database.close();
process.exitCode = exitCode;
