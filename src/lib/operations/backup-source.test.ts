import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { requireBackupSourceDirectory } from "../../../scripts/lib/backup-source.mjs";

const temporaryRoots: string[] = [];

function makeTemporaryRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "enbilir-backup-source-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("configured backup sources", () => {
  it("allows an omitted optional upload source", () => {
    expect(requireBackupSourceDirectory(undefined, "CHAT_UPLOAD_DIR")).toBeUndefined();
  });

  it("fails closed when a configured source is missing", () => {
    const missing = path.join(makeTemporaryRoot(), "missing");
    expect(() => requireBackupSourceDirectory(missing, "CHAT_UPLOAD_DIR")).toThrow(/missing or unreadable/i);
  });

  it("refuses a configured file in place of a directory", () => {
    const filePath = path.join(makeTemporaryRoot(), "upload.txt");
    writeFileSync(filePath, "not a directory");
    expect(() => requireBackupSourceDirectory(filePath, "ADMIN_UPLOAD_DIR")).toThrow(/real directory/i);
  });

  it("accepts an existing real directory", () => {
    const directory = makeTemporaryRoot();
    expect(requireBackupSourceDirectory(directory, "CHAT_UPLOAD_DIR")).toBe(directory);
  });
});
