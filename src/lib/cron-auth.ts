import "server-only";

import { timingSafeEqual } from "node:crypto";

export function isCronRequestAuthorized(request: Request, input: {
  envName: string;
  headerName?: string;
}) {
  const expected = process.env[input.envName] ?? "";
  const headerValue = input.headerName ? request.headers.get(input.headerName) : null;
  const bearerValue = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const received = headerValue ?? bearerValue ?? "";

  if (!expected) {
    return process.env.NODE_ENV !== "production" && process.env.ALLOW_INSECURE_LOCAL_CRON === "true";
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
