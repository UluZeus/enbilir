export type ContentSecurityPolicyEnvironment = "development" | "production";

export function buildContentSecurityPolicy(
  nonce: string,
  environment: ContentSecurityPolicyEnvironment,
) {
  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  const connectSources = ["'self'"];

  if (environment === "development") {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws://127.0.0.1:*", "ws://localhost:*");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
