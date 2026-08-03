import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";
import { proxy } from "../proxy";
import { buildContentSecurityPolicy } from "./content-security-policy";

function parseDirectives(policy: string) {
  return new Map(
    policy
      .split(";")
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...values] = directive.split(/\s+/);
        return [name, values] as const;
      }),
  );
}

describe("content security policy", () => {
  it("builds a strict production policy around the request nonce", () => {
    const policy = buildContentSecurityPolicy("test-nonce", "production");
    const directives = parseDirectives(policy);

    expect(directives.get("default-src")).toEqual(["'self'"]);
    expect(directives.get("script-src")).toEqual(["'self'", "'nonce-test-nonce'", "'strict-dynamic'"]);
    expect(directives.get("script-src")).not.toContain("'unsafe-inline'");
    expect(directives.get("script-src-attr")).toEqual(["'none'"]);
    expect(directives.get("style-src")).toEqual(["'self'", "'nonce-test-nonce'"]);
    expect(directives.get("style-src-attr")).toEqual(["'unsafe-inline'"]);
    expect(directives.get("connect-src")).toEqual(["'self'"]);
    expect(policy).not.toMatch(/(?:stooq|\bwss?:)/i);
    expect(directives.get("img-src")).toEqual(["'self'", "data:", "blob:", "https:"]);
    expect(directives.get("media-src")).toEqual(["'self'", "blob:", "https:"]);
    expect(directives.get("frame-src")).toEqual(["'self'", "https://www.youtube.com", "https://player.vimeo.com"]);
    expect(directives.get("font-src")).toEqual(["'self'", "data:"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
    expect(directives.get("base-uri")).toEqual(["'self'"]);
    expect(directives.get("form-action")).toEqual(["'self'"]);
  });

  it("allows only local development websocket endpoints and unsafe-eval", () => {
    const policy = buildContentSecurityPolicy("dev-nonce", "development");
    const directives = parseDirectives(policy);

    expect(directives.get("script-src")).toEqual([
      "'self'",
      "'nonce-dev-nonce'",
      "'strict-dynamic'",
      "'unsafe-eval'",
    ]);
    expect(directives.get("script-src")).not.toContain("'unsafe-inline'");
    expect(directives.get("connect-src")).toEqual([
      "'self'",
      "ws://127.0.0.1:*",
      "ws://localhost:*",
    ]);
    expect(policy).not.toMatch(/(?:stooq|\bwss:)/i);
  });

  it("overwrites untrusted nonce and CSP request headers", () => {
    const response = proxy(
      new NextRequest("https://enbilir.com/tr/blog", {
        headers: {
          "content-security-policy": "default-src *",
          "x-nonce": "attacker-controlled",
        },
      }),
    );
    const responsePolicy = response.headers.get("content-security-policy");
    const generatedNonce = responsePolicy?.match(/'nonce-([^']+)'/)?.[1];

    expect(generatedNonce).toBeTruthy();
    expect(generatedNonce).not.toBe("attacker-controlled");
    expect(responsePolicy).not.toContain("default-src *");
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(generatedNonce);
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(responsePolicy);
    expect(response.headers.get("x-middleware-request-x-enbilir-pathname")).toBe("/tr/blog");
  });
});

describe("security headers", () => {
  it("disables the powered-by header and preserves the global protections", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.headers).toBeTypeOf("function");

    const entries = await nextConfig.headers!();
    const globalHeaders = entries.find((entry) => entry.source === "/:path*")?.headers;

    expect(globalHeaders).toEqual([
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
    ]);

    const chatHeaders = entries.find((entry) => entry.source === "/uploads/chat/:path*")?.headers;
    expect(chatHeaders).toContainEqual({
      key: "Content-Security-Policy",
      value: "sandbox; default-src 'none'",
    });
  });

  it("keeps transport security at the canonical Nginx edge", () => {
    const nginx = readFileSync(resolve(process.cwd(), "deploy/nginx/enbilir.com.conf"), "utf8");
    const hsts = 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;';

    expect(nginx).toContain("server_tokens off;");
    expect(nginx.match(new RegExp(hsts.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(2);
    expect(nginx).toMatch(/listen 80;[\s\S]*server_name enbilir\.com www\.enbilir\.com;[\s\S]*return 308 https:\/\/enbilir\.com\$request_uri;/);
    expect(nginx).toMatch(/server_name enbilir\.com;[\s\S]*proxy_pass http:\/\/127\.0\.0\.1:3006;/);
    expect(nginx.match(/proxy_hide_header X-Powered-By;/g)).toHaveLength(2);
  });
});
