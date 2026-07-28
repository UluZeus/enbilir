import path from "node:path";

const rules = [
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "openai-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "github-token", pattern: /\bgh[opsu]_[A-Za-z0-9]{20,}\b/ },
  { name: "aws-access-key", pattern: /\bAKIA[A-Z0-9]{16}\b/ },
  { name: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    name: "literal-secret-assignment",
    pattern:
      /\b(?:AUTH_SECRET|PASSWORD|API_KEY|CLIENT_SECRET|CRON_SECRET|WEBHOOK_SECRET)\b\s*[:=]\s*["'](?!change[-_ ]|replace[-_ ]|your[-_ ]|example|dummy|placeholder|synthetic[-_ ]|process\.env)[^"']{16,}["']/i,
  },
];

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
  ".sql",
  ".sh",
]);

export function shouldScanRepositoryFile(relativePath) {
  if (relativePath.endsWith("package-lock.json")) return false;
  const extension = path.extname(relativePath).toLowerCase();
  const baseName = path.basename(relativePath);
  return textExtensions.has(extension) || baseName === "Dockerfile" || baseName === ".env.example";
}

export function findPotentialSecretRules(line) {
  return rules.filter((rule) => rule.pattern.test(line)).map((rule) => rule.name);
}
