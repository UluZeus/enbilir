import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { sha256File } from "./operations.mjs";

const MANIFEST_NAME = "release-manifest.json";
const MAX_MANIFEST_BYTES = 10 * 1024 * 1024;

function assertSafeManifestPath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    !relativePath ||
    relativePath.includes("\\") ||
    path.posix.isAbsolute(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath ||
    relativePath.split("/").includes("..") ||
    relativePath === MANIFEST_NAME
  ) {
    throw new Error(`Release manifest contains an unsafe payload path: ${String(relativePath)}.`);
  }
}

function collectPayloadFiles(root, current = root, result = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolutePath = path.join(current, entry.name);
    const stats = lstatSync(absolutePath);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    if (stats.isSymbolicLink()) {
      throw new Error(`Release verification refuses symbolic links: ${relativePath}.`);
    }
    if (entry.name === ".env" || entry.name.startsWith(".env.") || entry.name.endsWith(".log")) {
      throw new Error(`Release verification refuses environment and log files: ${relativePath}.`);
    }
    if (stats.isDirectory()) {
      collectPayloadFiles(root, absolutePath, result);
    } else if (stats.isFile() && relativePath !== MANIFEST_NAME) {
      result.push({
        path: relativePath,
        sizeBytes: stats.size,
        sha256: sha256File(absolutePath),
      });
    }
  }
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

export function verifyReleaseArtifact(releaseRoot, expectedCommitSha) {
  const resolvedRoot = path.resolve(releaseRoot);
  let rootStats;
  try {
    rootStats = lstatSync(resolvedRoot);
  } catch (error) {
    throw new Error(`Release artifact is missing or unreadable: ${resolvedRoot}.`, { cause: error });
  }
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error("Release artifact must be a real directory.");
  }

  const manifestPath = path.join(resolvedRoot, MANIFEST_NAME);
  const manifestStats = lstatSync(manifestPath);
  if (!manifestStats.isFile() || manifestStats.isSymbolicLink() || manifestStats.size > MAX_MANIFEST_BYTES) {
    throw new Error("Release manifest must be a small, regular file.");
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error("Release manifest is not valid JSON.", { cause: error });
  }
  if (manifest?.version !== 2) throw new Error("Unsupported release manifest version.");
  if (!/^[a-f0-9]{40}$/.test(manifest.commitSha || "")) {
    throw new Error("Release manifest does not contain an immutable commit SHA.");
  }
  if (manifest.buildId !== manifest.commitSha) {
    throw new Error("Release build ID does not match its commit SHA.");
  }
  if (expectedCommitSha && manifest.commitSha !== expectedCommitSha) {
    throw new Error(`Release belongs to ${manifest.commitSha}, not expected commit ${expectedCommitSha}.`);
  }
  if (manifest.startCommand !== "node server.js") {
    throw new Error("Release manifest contains an unexpected start command.");
  }
  if (!Array.isArray(manifest.payloadFiles) || !Number.isSafeInteger(manifest.payloadFileCount)) {
    throw new Error("Release manifest payload inventory is invalid.");
  }
  if (manifest.payloadFileCount !== manifest.payloadFiles.length) {
    throw new Error("Release manifest payload count is inconsistent.");
  }

  const expectedFiles = new Map();
  for (const file of manifest.payloadFiles) {
    assertSafeManifestPath(file?.path);
    if (
      !Number.isSafeInteger(file.sizeBytes) ||
      file.sizeBytes < 0 ||
      !/^[a-f0-9]{64}$/.test(file.sha256 || "") ||
      expectedFiles.has(file.path)
    ) {
      throw new Error(`Release manifest has invalid or duplicate metadata for ${String(file?.path)}.`);
    }
    expectedFiles.set(file.path, file);
  }
  if (!expectedFiles.has("server.js")) throw new Error("Release payload does not contain server.js.");

  const actualFiles = collectPayloadFiles(resolvedRoot);
  if (actualFiles.length !== expectedFiles.size) {
    throw new Error(`Release payload count mismatch: expected ${expectedFiles.size}, found ${actualFiles.length}.`);
  }
  for (const actual of actualFiles) {
    const expected = expectedFiles.get(actual.path);
    if (!expected) throw new Error(`Release payload contains an unlisted file: ${actual.path}.`);
    if (expected.sizeBytes !== actual.sizeBytes || expected.sha256 !== actual.sha256) {
      throw new Error(`Release payload integrity mismatch: ${actual.path}.`);
    }
  }

  return {
    releaseRoot: resolvedRoot,
    commitSha: manifest.commitSha,
    payloadFileCount: actualFiles.length,
  };
}
