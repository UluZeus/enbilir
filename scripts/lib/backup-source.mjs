import { lstatSync } from "node:fs";

export function requireBackupSourceDirectory(sourceRoot, label) {
  if (!sourceRoot) return undefined;

  let stats;
  try {
    stats = lstatSync(sourceRoot);
  } catch (error) {
    throw new Error(`${label} backup source is missing or unreadable: ${sourceRoot}.`, { cause: error });
  }

  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`${label} backup source must be a real directory: ${sourceRoot}.`);
  }
  return sourceRoot;
}
