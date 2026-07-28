const patterns: Array<[RegExp, string]> = [
  [/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]"],
  [/\b((?:api[_-]?key|token|secret|password|authorization|cookie)\s*[=:]\s*)[^\s&,;]+/gi, "$1[REDACTED]"],
  [/([?&](?:secret|token|key|signature|code)=)[^&#\s]+/gi, "$1[REDACTED]"],
  [/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
];

export function redactOperationalText(value: unknown, maxLength = 4_000) {
  let output = value instanceof Error ? value.message : String(value ?? "");
  for (const [pattern, replacement] of patterns) {
    output = output.replace(pattern, replacement);
  }
  return output.slice(0, Math.max(0, maxLength));
}
