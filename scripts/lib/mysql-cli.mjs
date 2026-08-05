import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";

const IDENTIFIER = /^[A-Za-z0-9_]+$/;
const LOGIN_PATH = /^[A-Za-z0-9_.-]+$/;

function requireIdentifier(value, label) {
  if (!value || !IDENTIFIER.test(value)) {
    throw new Error(`${label} must contain only letters, digits, and underscores.`);
  }
  return value;
}

export function requireMysqlDefaultsFile(value = process.env.MYSQL_DEFAULTS_FILE) {
  if (!value || !path.isAbsolute(value)) {
    throw new Error("MYSQL_DEFAULTS_FILE must be an absolute path to a protected MySQL option file.");
  }
  const stats = statSync(value);
  if (!stats.isFile()) throw new Error("MYSQL_DEFAULTS_FILE must reference a regular file.");
  if (process.platform !== "win32" && (stats.mode & 0o077) !== 0) {
    throw new Error("MYSQL_DEFAULTS_FILE must not be accessible by group or other users.");
  }
  return value;
}

export function requireMysqlDatabase(value = process.env.MYSQL_DATABASE) {
  return requireIdentifier(value, "MYSQL_DATABASE");
}

export function requireMysqlLoginPath(value = process.env.MYSQL_LOGIN_PATH) {
  if (!value || !LOGIN_PATH.test(value)) {
    throw new Error("MYSQL_LOGIN_PATH contains invalid characters.");
  }
  return value;
}

export function buildMysqlArguments(options) {
  const { defaultsFile, loginPath, database, includeDatabase = true } = options;
  if (Boolean(defaultsFile) === Boolean(loginPath)) {
    throw new Error("Exactly one protected MySQL credential source is required.");
  }
  const args = [
    defaultsFile ? `--defaults-extra-file=${defaultsFile}` : `--login-path=${requireMysqlLoginPath(loginPath)}`,
    "--default-character-set=utf8mb4",
    "--batch",
    "--column-names",
  ];
  if (includeDatabase) args.push(`--database=${requireIdentifier(database, "database")}`);
  return args;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: options.encoding ?? "utf8",
    input: options.input,
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
    stdio: options.stdio,
  });
  if (result.error) throw new Error(`${command} could not be executed.`, { cause: result.error });
  if (result.status !== 0) {
    const errorCode = /(?:ERROR|Error)\s+(\d+)/.exec(String(result.stderr ?? ""))?.[1];
    throw new Error(`${command} exited unsuccessfully${errorCode ? ` (errorCode=${errorCode})` : ""}; details were withheld from operational output.`);
  }
  return result;
}

function decodeBatchValue(value) {
  if (value === "NULL") return null;
  return value.replace(/\\([0btnrZ\\])/g, (_match, token) => ({
    "0": "\0",
    b: "\b",
    t: "\t",
    n: "\n",
    r: "\r",
    Z: "\x1a",
    "\\": "\\",
  })[token]);
}

export function parseMysqlBatch(output) {
  const lines = String(output ?? "").trimEnd().split(/\r?\n/);
  if (lines.length < 2 || !lines[0]) return [];
  const columns = lines[0].split("\t").map(decodeBatchValue);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split("\t").map(decodeBatchValue);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null]));
  });
}

function isProvablyReadOnlyMysqlQuery(sql) {
  const statement = String(sql ?? "").trim();
  if (!/^SELECT\b/i.test(statement)) return false;
  const withoutTrailingSemicolon = statement.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) return false;
  if (/\bINTO\b|\bFOR\s+(?:UPDATE|SHARE)\b|\bLOCK\s+IN\s+SHARE\s+MODE\b/i.test(statement)) {
    return false;
  }
  if (/:=|\b(?:GET_LOCK|RELEASE_LOCK|IS_FREE_LOCK|IS_USED_LOCK|SLEEP|BENCHMARK|LAST_INSERT_ID)\s*\(/i.test(statement)) {
    return false;
  }
  return true;
}

const RETRY_WAIT_SIGNAL = new Int32Array(new SharedArrayBuffer(4));
const MYSQL_READ_ONLY_FRAME_HEADER = "__enbilir_cli_frame__";
const MYSQL_READ_ONLY_FRAME_VALUE = "complete";

function stripMysqlReadOnlyFrame(stdout) {
  for (const newline of ["\n", "\r\n"]) {
    const frame = `${MYSQL_READ_ONLY_FRAME_HEADER}${newline}${MYSQL_READ_ONLY_FRAME_VALUE}${newline}`;
    if (stdout.endsWith(frame)) return stdout.slice(0, -frame.length);
  }
  return null;
}

function waitBeforeMysqlRetry(milliseconds) {
  Atomics.wait(RETRY_WAIT_SIGNAL, 0, 0, milliseconds);
}

export function queryMysqlWithRetry({ sql, execute, maxAttempts = 6, wait = waitBeforeMysqlRetry }) {
  if (typeof execute !== "function") throw new Error("MySQL query executor is required.");
  if (typeof wait !== "function") throw new Error("MySQL query retry wait function is required.");
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 6) {
    throw new Error("MySQL read-only query retry limit must be from 1 through 6.");
  }
  const retryable = isProvablyReadOnlyMysqlQuery(sql);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = execute();
    const stdout = String(result.stdout ?? "");
    const unframedOutput = retryable ? stripMysqlReadOnlyFrame(stdout) : null;
    if (unframedOutput !== null) return parseMysqlBatch(unframedOutput);
    if (!retryable && stdout !== "" && stdout.endsWith("\n")) return parseMysqlBatch(stdout);
    const outputCategory = stdout === "" ? "empty" : "incomplete";
    if (!retryable) {
      throw new Error(`MySQL query returned ${outputCategory} output; retry was suppressed because the statement was not provably read-only.`);
    }
    if (attempt === maxAttempts) {
      throw new Error(`MySQL read-only query returned ${outputCategory} output after ${maxAttempts} attempts; query details were withheld.`);
    }
    wait(50 * (2 ** (attempt - 1)));
  }
  throw new Error("MySQL read-only query retry failed unexpectedly.");
}

export function mysqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return `X'${Buffer.from(value).toString("hex")}'`;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error("Invalid Date SQL parameter.");
    return `'${value.toISOString().replace("T", " ").replace("Z", "")}'`;
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite numeric SQL parameter.");
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `'${stringValue.replaceAll("'", "''").replaceAll("\\", "\\\\")}'`;
}

export function interpolateSql(sql, parameters = []) {
  if (!Array.isArray(parameters)) {
    return sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (match, key) => (
      Object.hasOwn(parameters, key) ? mysqlLiteral(parameters[key]) : match
    ));
  }
  let index = 0;
  const rendered = sql.replace(/\?/g, () => {
    if (index >= parameters.length) throw new Error("Missing SQL parameter.");
    return mysqlLiteral(parameters[index++]);
  });
  if (index !== parameters.length) throw new Error("Too many SQL parameters.");
  return rendered;
}

export function createMysqlCli(options = {}) {
  const configuredDefaultsFile = options.defaultsFile ?? process.env.MYSQL_DEFAULTS_FILE;
  const configuredLoginPath = options.loginPath ?? process.env.MYSQL_LOGIN_PATH;
  if (configuredLoginPath && (process.env.ENBILIR_ENV === "production" || process.env.NODE_ENV === "production")) {
    throw new Error("Production MySQL requires a protected option file; login paths are local-only.");
  }
  const defaultsFile = configuredDefaultsFile ? requireMysqlDefaultsFile(configuredDefaultsFile) : null;
  const loginPath = defaultsFile ? null : requireMysqlLoginPath(configuredLoginPath);
  const database = requireMysqlDatabase(options.database);
  const executable = options.executable ?? process.env.MYSQL_BINARY ?? "mysql";
  const args = buildMysqlArguments({ defaultsFile, loginPath, database });

  return {
    database,
    defaultsFile,
    loginPath,
    execute(sql) {
      run(executable, [...args, "--skip-column-names"], { input: `SET time_zone = '+00:00';\n${sql}\n` });
    },
    query(sql) {
      const retryable = isProvablyReadOnlyMysqlQuery(sql);
      const statement = retryable
        ? `${String(sql).trim().replace(/;$/, "")};\nSELECT '${MYSQL_READ_ONLY_FRAME_VALUE}' AS \`${MYSQL_READ_ONLY_FRAME_HEADER}\`;`
        : sql;
      return queryMysqlWithRetry({
        sql,
        execute: () => run(executable, args, { input: `SET time_zone = '+00:00';\n${statement}\n` }),
      });
    },
    queryScalar(sql) {
      const row = this.query(sql)[0];
      return row ? Object.values(row)[0] : undefined;
    },
  };
}

export class MysqlCliDatabase {
  constructor(options = {}) {
    this.client = createMysqlCli(options);
    this.pending = null;
  }

  prepare(sql) {
    return {
      all: (...parameters) => this.client.query(interpolateSql(sql, parameters)),
      get: (...parameters) => this.client.query(interpolateSql(sql, parameters))[0],
      run: (...parameters) => {
        const normalized = parameters.length === 1 && parameters[0] && typeof parameters[0] === "object" && !Array.isArray(parameters[0])
          ? parameters[0]
          : parameters;
        const rendered = interpolateSql(sql, normalized);
        if (this.pending) {
          this.pending.push(rendered);
          return { changes: 0 };
        }
        const rows = this.client.query(`${rendered};\nSELECT ROW_COUNT() AS changes;`);
        return { changes: Number(rows.at(-1)?.changes ?? 0) };
      },
    };
  }

  transaction(callback) {
    return (...parameters) => {
      if (this.pending) throw new Error("Nested MySQL CLI transactions are not supported.");
      this.pending = [];
      try {
        const value = callback(...parameters);
        const statements = this.pending;
        this.pending = null;
        if (statements.length > 0) {
          this.client.execute(`START TRANSACTION;\n${statements.join(";\n")};\nCOMMIT;`);
        }
        return value;
      } catch (error) {
        this.pending = null;
        throw error;
      }
    };
  }

  exec(sql) {
    this.client.execute(sql);
  }

  close() {}
}
