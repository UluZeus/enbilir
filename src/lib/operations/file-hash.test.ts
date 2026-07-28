import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { sha256File } from "../../../scripts/lib/operations.mjs";

describe("operational file hashing", () => {
  it("hashes files incrementally across multiple read chunks", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "enbilir-file-hash-"));
    try {
      const filePath = path.join(directory, "multi-chunk.bin");
      const payload = Buffer.alloc(2 * 1024 * 1024 + 17, 0x5a);
      writeFileSync(filePath, payload);

      expect(sha256File(filePath)).toBe(createHash("sha256").update(payload).digest("hex"));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
