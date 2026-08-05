import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { sha256File } from "./lib/operations.mjs";
import { verifyReleaseArtifact } from "./lib/release-verification.mjs";

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getPositionalArguments() {
  return process.argv.slice(2).filter((argument, index, arguments_) => {
    if (argument.startsWith("--")) return false;
    return index === 0 || !arguments_[index - 1].startsWith("--");
  });
}

function copyDirectoryContents(sourceRoot, destinationRoot) {
  const excludedTopLevel = new Set(["artifacts", "public", "scripts"]);
  const shouldCopy = (sourcePath) => {
    const relative = path.relative(sourceRoot, sourcePath);
    if (!relative) return true;
    const segments = relative.split(path.sep);
    const baseName = segments.at(-1) || "";
    if (excludedTopLevel.has(segments[0])) return false;
    if (baseName === ".env" || baseName.startsWith(".env.") || baseName.endsWith(".log")) return false;
    return true;
  };
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!shouldCopy(path.join(sourceRoot, entry.name))) continue;
    cpSync(path.join(sourceRoot, entry.name), path.join(destinationRoot, entry.name), {
      recursive: true,
      dereference: true,
      errorOnExist: true,
      force: false,
      filter: shouldCopy,
    });
  }
}

function copyTrackedRuntimeFiles(trackedFiles, prefix, destinationRoot) {
  const normalizedPrefix = `${prefix.replaceAll("\\", "/").replace(/\/+$/, "")}/`;
  for (const relativePath of trackedFiles) {
    const normalizedPath = relativePath.replaceAll("\\", "/");
    if (!normalizedPath.startsWith(normalizedPrefix)) continue;
    const sourcePath = path.join(process.cwd(), ...normalizedPath.split("/"));
    const sourceStats = lstatSync(sourcePath);
    if (!sourceStats.isFile() || sourceStats.isSymbolicLink()) {
      throw new Error(`Runtime payload refuses non-file tracked path: ${normalizedPath}.`);
    }
    const destinationPath = path.join(destinationRoot, ...normalizedPath.split("/"));
    mkdirSync(path.dirname(destinationPath), { recursive: true, mode: 0o750 });
    copyFileSync(sourcePath, destinationPath);
  }
}

function collectPayloadFiles(root, current = root, result = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolutePath = path.join(current, entry.name);
    const stats = lstatSync(absolutePath);
    if (stats.isSymbolicLink()) {
      throw new Error(`Release artifacts refuse symbolic links: ${path.relative(root, absolutePath)}.`);
    }
    if (entry.name === ".env" || entry.name.startsWith(".env.") || entry.name.endsWith(".log")) {
      throw new Error(`Release artifacts refuse environment and log files: ${path.relative(root, absolutePath)}.`);
    }
    if (stats.isDirectory()) {
      collectPayloadFiles(root, absolutePath, result);
    } else if (stats.isFile() && entry.name !== "release-manifest.json") {
      result.push({
        path: path.relative(root, absolutePath).split(path.sep).join("/"),
        sizeBytes: stats.size,
        sha256: sha256File(absolutePath),
      });
    }
  }
  return result;
}

function makeReadOnly(root, current = root) {
  if (process.platform === "win32") return;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      makeReadOnly(root, absolutePath);
    } else {
      chmodSync(absolutePath, 0o440);
    }
  }
  chmodSync(current, 0o550);
}

const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
if (dirty) throw new Error("Release artifacts require a clean working tree.");

const commitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(commitSha)) throw new Error("Unable to resolve an immutable commit SHA.");
const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const buildRoot = path.join(process.cwd(), ".next");
const buildIdPath = path.join(buildRoot, "BUILD_ID");
const standaloneRoot = path.join(buildRoot, "standalone");
if (!existsSync(buildIdPath) || !existsSync(path.join(standaloneRoot, "server.js"))) {
  throw new Error("Run a successful standalone production build before creating a release artifact.");
}
const buildId = readFileSync(buildIdPath, "utf8").trim();
if (buildId !== commitSha) {
  throw new Error(`Build belongs to ${buildId || "(missing build id)"}, not current HEAD ${commitSha}. Rebuild first.`);
}

const outputRoot = path.resolve(
  getArgument("--output") || getPositionalArguments()[0] || path.join(process.cwd(), "artifacts", "releases"),
);
if (outputRoot === process.cwd()) throw new Error("Release output cannot be the application root.");
const releasePath = path.join(outputRoot, commitSha);
const partialPath = path.join(outputRoot, `.partial-${commitSha}-${process.pid}`);
if (existsSync(releasePath) || existsSync(partialPath)) {
  throw new Error(`Release artifact ${commitSha} already exists or is being prepared.`);
}

mkdirSync(outputRoot, { recursive: true, mode: 0o750 });
if (process.platform !== "win32") chmodSync(outputRoot, 0o750);
mkdirSync(partialPath, { recursive: false, mode: 0o750 });

try {
  copyDirectoryContents(standaloneRoot, partialPath);
  cpSync(path.join(buildRoot, "static"), path.join(partialPath, ".next", "static"), {
    recursive: true,
    dereference: true,
    errorOnExist: true,
    force: false,
  });

  // Only Git-tracked public/runtime resources enter a release; local uploads and secrets never do.
  copyTrackedRuntimeFiles(trackedFiles, "public", partialPath);
  copyTrackedRuntimeFiles(trackedFiles, "scripts", partialPath);
  copyTrackedRuntimeFiles(trackedFiles, "prisma/migrations-mysql", partialPath);

  const payloadFiles = collectPayloadFiles(partialPath).sort((left, right) => left.path.localeCompare(right.path));
  const serverEntry = payloadFiles.find((file) => file.path === "server.js");
  if (!serverEntry) throw new Error("Standalone artifact does not contain server.js.");

  const manifest = {
    version: 2,
    commitSha,
    buildId,
    createdAt: new Date().toISOString(),
    startCommand: "node server.js",
    payloadFileCount: payloadFiles.length,
    payloadFiles,
  };
  writeFileSync(path.join(partialPath, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o440,
  });

  const verification = verifyReleaseArtifact(partialPath, commitSha);
  makeReadOnly(partialPath);
  renameSync(partialPath, releasePath);
  console.log(
    `[release-artifact] Prepared and verified ${verification.payloadFileCount} files for standalone release ${commitSha}; start with node server.js.`,
  );
} catch (error) {
  if (existsSync(partialPath)) {
    if (process.platform !== "win32") {
      // Restore owner write permission only for cleanup of this exact partial directory.
      const restoreWrite = (current) => {
        chmodSync(current, 0o700);
        for (const entry of readdirSync(current, { withFileTypes: true })) {
          const absolutePath = path.join(current, entry.name);
          if (entry.isDirectory()) restoreWrite(absolutePath);
          else chmodSync(absolutePath, 0o600);
        }
      };
      restoreWrite(partialPath);
    }
    rmSync(partialPath, { recursive: true, force: true });
  }
  throw error;
}
