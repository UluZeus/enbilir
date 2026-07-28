import { existsSync } from "node:fs";
import path from "node:path";

import { assertPrivateFilePermissions } from "./lib/operations.mjs";

const envPath = path.join(process.cwd(), ".env");
if (!existsSync(envPath)) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Production .env file is missing.");
  }
  console.log("[env-permissions] No local .env file; nothing to inspect.");
  process.exit(0);
}

if (process.platform === "win32") {
  console.log("[env-permissions] POSIX mode verification is unavailable on Windows; no values were read.");
  process.exit(0);
}

assertPrivateFilePermissions(envPath);
console.log("[env-permissions] .env permissions are private.");
