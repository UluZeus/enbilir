import path from "node:path";

function persistentDirectory(envName: "ADMIN_UPLOAD_DIR" | "CHAT_UPLOAD_DIR", developmentSegments: string[]) {
  const configured = process.env[envName];

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${envName} must point to a persistent directory in production.`);
    }
    return path.resolve(/* turbopackIgnore: true */ process.cwd(), ...developmentSegments);
  }

  if (!path.isAbsolute(configured)) {
    throw new Error(`${envName} must be an absolute path.`);
  }

  const resolved = path.resolve(/* turbopackIgnore: true */ configured);
  const relativeToApp = path.relative(process.cwd(), resolved);

  if (process.env.NODE_ENV === "production" && relativeToApp && !relativeToApp.startsWith("..") && !path.isAbsolute(relativeToApp)) {
    throw new Error(`${envName} must be outside the production release directory.`);
  }

  return resolved;
}

export function getPersistentAdminUploadDirectory() {
  return persistentDirectory("ADMIN_UPLOAD_DIR", [".data", "uploads", "admin"]);
}

export function getPersistentChatUploadDirectory() {
  return persistentDirectory("CHAT_UPLOAD_DIR", [".data", "uploads", "chat"]);
}
