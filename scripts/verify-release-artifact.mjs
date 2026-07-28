import path from "node:path";

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

const positionalArguments = getPositionalArguments();
const releaseArgument = getArgument("--release") || positionalArguments[0];
const expectedCommitSha = getArgument("--commit") || positionalArguments[1];
if (!releaseArgument) {
  throw new Error("Usage: npm run release:verify -- --release <release-directory> [--commit <40-character-sha>]");
}
if (expectedCommitSha && !/^[a-f0-9]{40}$/.test(expectedCommitSha)) {
  throw new Error("--commit must be a 40-character lowercase Git SHA.");
}

const result = verifyReleaseArtifact(path.resolve(releaseArgument), expectedCommitSha);
console.log(
  `[release-verify] Verified ${result.payloadFileCount} files for immutable release ${result.commitSha}.`,
);
