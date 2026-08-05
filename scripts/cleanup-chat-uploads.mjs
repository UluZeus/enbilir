import { existsSync, lstatSync, unlinkSync } from "node:fs";
import path from "node:path";

import {
  isSafeChildPath,
  loadLocalEnvironment,
  requireExternalAbsoluteDirectory,
} from "./lib/operations.mjs";
import { MysqlCliDatabase } from "./lib/mysql-cli.mjs";

loadLocalEnvironment();
const apply = process.argv.includes("--apply");
const uploadRoot = requireExternalAbsoluteDirectory(
  process.env.CHAT_UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads", "chat"),
  "CHAT_UPLOAD_DIR",
);
const database = new MysqlCliDatabase();

const expired = database
  .prepare(
    `SELECT id, storedName
     FROM ChatUpload
     WHERE status = 'STAGED' AND expiresAt <= ?
     ORDER BY expiresAt ASC
     LIMIT 1000`,
  )
  .all(new Date());

if (!apply) {
  console.log(`[chat-upload-cleanup] Dry-run: ${expired.length} expired staged upload record(s) would be removed.`);
  database.close();
  process.exit(0);
}

const removeRecord = database.prepare(
  `DELETE FROM ChatUpload
   WHERE id = ? AND status = 'STAGED' AND expiresAt <= ?`,
);
let removed = 0;
let refused = 0;
for (const upload of expired) {
  if (path.basename(upload.storedName) !== upload.storedName) {
    refused += 1;
    continue;
  }
  const filePath = path.join(uploadRoot, upload.storedName);
  if (!isSafeChildPath(uploadRoot, filePath)) {
    refused += 1;
    continue;
  }
  if (existsSync(filePath)) {
    const fileStats = lstatSync(filePath);
    if (!fileStats.isFile() || fileStats.isSymbolicLink()) {
      refused += 1;
      continue;
    }
    unlinkSync(filePath);
  }
  removed += removeRecord.run(upload.id, new Date()).changes;
}
database.close();
console.log(`[chat-upload-cleanup] Removed ${removed} expired staged upload(s); refused ${refused} unsafe entry/entries.`);
if (refused > 0) process.exitCode = 1;
