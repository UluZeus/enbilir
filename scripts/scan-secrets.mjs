import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

import { findPotentialSecretRules, shouldScanRepositoryFile } from "./lib/secret-scan-rules.mjs";

const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const findings = [];

for (const relativePath of tracked) {
  if (!shouldScanRepositoryFile(relativePath)) continue;
  if (statSync(relativePath).size > 2 * 1024 * 1024) continue;
  const lines = readFileSync(relativePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of findPotentialSecretRules(line)) {
      findings.push({ file: relativePath, line: index + 1, rule });
    }
  });
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`[secret-scan] ${finding.file}:${finding.line} ${finding.rule}`);
  }
  throw new Error(`Secret scan found ${findings.length} potential tracked secret(s). Values were not printed.`);
}
console.log(`[secret-scan] ${tracked.length} repository file(s) inspected; no known secret pattern found.`);
