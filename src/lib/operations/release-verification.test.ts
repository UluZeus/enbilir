import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { verifyReleaseArtifact } from "../../../scripts/lib/release-verification.mjs";

const temporaryRoots: string[] = [];
const commitSha = "a".repeat(40);

function sha256(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function createRelease() {
  const root = mkdtempSync(path.join(tmpdir(), "enbilir-release-verify-"));
  temporaryRoots.push(root);
  mkdirSync(path.join(root, ".next"), { recursive: true });
  const serverPath = path.join(root, "server.js");
  const buildPath = path.join(root, ".next", "BUILD_ID");
  writeFileSync(serverPath, "console.log('ready');\n");
  writeFileSync(buildPath, commitSha);
  const payloadFiles = [serverPath, buildPath]
    .map((filePath) => ({
      path: path.relative(root, filePath).split(path.sep).join("/"),
      sizeBytes: readFileSync(filePath).byteLength,
      sha256: sha256(filePath),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  writeFileSync(
    path.join(root, "release-manifest.json"),
    JSON.stringify({
      version: 2,
      commitSha,
      buildId: commitSha,
      createdAt: new Date().toISOString(),
      startCommand: "node server.js",
      payloadFileCount: payloadFiles.length,
      payloadFiles,
    }),
  );
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("immutable release verification", () => {
  it("accepts a complete artifact bound to the expected commit", () => {
    const root = createRelease();
    expect(verifyReleaseArtifact(root, commitSha)).toMatchObject({ commitSha, payloadFileCount: 2 });
  });

  it("detects a changed payload file", () => {
    const root = createRelease();
    writeFileSync(path.join(root, "server.js"), "tampered");
    expect(() => verifyReleaseArtifact(root, commitSha)).toThrow(/integrity mismatch/i);
  });

  it("detects an unlisted payload file", () => {
    const root = createRelease();
    writeFileSync(path.join(root, "unexpected.txt"), "unexpected");
    expect(() => verifyReleaseArtifact(root, commitSha)).toThrow(/count mismatch|unlisted/i);
  });

  it("rejects a release for the wrong commit", () => {
    const root = createRelease();
    expect(() => verifyReleaseArtifact(root, "b".repeat(40))).toThrow(/not expected commit/i);
  });
});
