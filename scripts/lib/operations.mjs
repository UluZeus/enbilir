import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const redactionPatterns = [
  [/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]"],
  [/\b((?:api[_-]?key|token|secret|password|authorization|cookie)\s*[=:]\s*)[^\s&,;]+/gi, "$1[REDACTED]"],
  [/([?&](?:secret|token|key|signature|code)=)[^&#\s]+/gi, "$1[REDACTED]"],
  [/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
];

function parseDotenvValue(raw) {
  const value = raw.trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function loadLocalEnvironment(envPath = path.join(process.cwd(), ".env")) {
  let source;
  try {
    source = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = parseDotenvValue(match[2]);
  }
}

export function getSqliteDatabasePath(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("DATABASE_URL must use a SQLite file: URL.");
  }
  const configuredPath = databaseUrl.slice("file:".length);
  const databasePath = path.isAbsolute(configuredPath)
    ? path.normalize(configuredPath)
    : path.resolve(process.cwd(), configuredPath);

  if (process.env.NODE_ENV === "production" && !path.isAbsolute(configuredPath)) {
    throw new Error("Production DATABASE_URL must use an absolute path.");
  }
  if (process.env.NODE_ENV === "production" && /(^|[/\\])dev\.db$/i.test(databasePath)) {
    throw new Error("Production operations refuse a development database.");
  }
  return databasePath;
}

export function requireExternalAbsoluteDirectory(value, key) {
  if (!value || !path.isAbsolute(value)) {
    throw new Error(`${key} must be an absolute directory.`);
  }
  const resolved = path.resolve(value);
  const relative = path.relative(process.cwd(), resolved);
  if (process.env.NODE_ENV === "production" && (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)))) {
    throw new Error(`${key} must remain outside the application release directory.`);
  }
  return resolved;
}

export function redactOperationalText(value, maxLength = 4_000) {
  let output = value instanceof Error ? value.message : String(value ?? "");
  for (const [pattern, replacement] of redactionPatterns) {
    output = output.replace(pattern, replacement);
  }
  return output.slice(0, Math.max(0, maxLength));
}

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function assertPrivateFilePermissions(filePath) {
  if (process.platform === "win32") return;
  const mode = statSync(filePath).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new Error(`${path.basename(filePath)} must not be readable or writable by group/other users.`);
  }
}

export function isSafeChildPath(rootPath, candidatePath) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}
