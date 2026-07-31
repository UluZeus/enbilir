import {
  chmodSync,
  chownSync,
  lstatSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const backupSetPattern = /^enbilir-\d{8}T\d{6}Z$/;
const partialSetPattern = /^\.partial-(enbilir-\d{8}T\d{6}Z)-([1-9]\d*)$/;
const maximumGroupId = 2_147_483_647;
const manifestFileName = "manifest.json";
const restoreMarkerFileName = "last-restore-rehearsal.json";
const sha256Pattern = /^[a-f0-9]{64}$/;
/** @type {(entryPath: import("node:fs").PathLike) => any} */
const defaultLstatOperation = (entryPath) => lstatSync(entryPath, { bigint: true });

function isProductionEnvironment(env) {
  const explicitEnvironment = env.ENBILIR_ENV?.trim().toLowerCase();
  return explicitEnvironment === "production" || (!explicitEnvironment && env.NODE_ENV === "production");
}

function assertValidGroupId(groupId) {
  if (!Number.isSafeInteger(groupId) || groupId < 1 || groupId > maximumGroupId) {
    throw new Error("BACKUP_HEALTH_GID must be a positive numeric group id.");
  }
  return groupId;
}

export function assertBackupSetName(setName) {
  if (typeof setName !== "string" || !backupSetPattern.test(setName)) {
    throw new Error("Backup set name is invalid.");
  }
  return setName;
}

export function resolveBackupHealthGroupId(value, env = process.env) {
  const resolvedValue = arguments.length === 0 ? env.BACKUP_HEALTH_GID : value;
  const normalizedValue = resolvedValue?.trim();
  if (!normalizedValue) {
    if (isProductionEnvironment(env)) {
      throw new Error("BACKUP_HEALTH_GID is required in production.");
    }
    return null;
  }
  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    throw new Error("BACKUP_HEALTH_GID must be a positive numeric group id.");
  }
  return assertValidGroupId(Number(normalizedValue));
}

function entryType(stats) {
  if (stats.isSymbolicLink()) return "symbolic-link";
  if (stats.isDirectory()) return "directory";
  if (stats.isFile()) return "file";
  return "special";
}

function snapshotStats(stats) {
  const type = entryType(stats);
  return {
    dev: String(stats.dev),
    ino: String(stats.ino),
    type,
    ...(type === "file" ? { nlink: Number(stats.nlink) } : {}),
  };
}

function assertSingleLinkFile(stats, label) {
  if (Number(stats.nlink) !== 1) throw new Error(`${label} must not be a hard link.`);
}

function assertRealDirectory(directoryPath, label, lstatOperation) {
  const stats = lstatOperation(directoryPath);
  const type = entryType(stats);
  if (type === "symbolic-link") throw new Error(`${label} must not be a symbolic link.`);
  if (type !== "directory") throw new Error(`${label} must be a real directory.`);
  return stats;
}

function assertRealFile(filePath, label, lstatOperation) {
  const stats = lstatOperation(filePath);
  const type = entryType(stats);
  if (type === "symbolic-link") throw new Error(`${label} must not be a symbolic link.`);
  if (type !== "file") throw new Error(`${label} must be a regular file.`);
  assertSingleLinkFile(stats, label);
  return stats;
}

function isSafeChildPath(rootPath, candidatePath) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolvePhysicalSetName(setName, physicalSetName = setName) {
  assertBackupSetName(setName);
  if (physicalSetName === setName) return physicalSetName;
  const match = typeof physicalSetName === "string" ? physicalSetName.match(partialSetPattern) : null;
  if (!match || match[1] !== setName || path.basename(physicalSetName) !== physicalSetName) {
    throw new Error("Physical backup set must be the exact final set or its expected direct partial child.");
  }
  return physicalSetName;
}

function parseManifest(manifestPath, expectedSetName, lstatOperation) {
  const stats = assertRealFile(manifestPath, "Backup manifest", lstatOperation);
  if (Number(stats.size) < 1 || Number(stats.size) > 2 * 1024 * 1024) {
    throw new Error("Backup manifest has an invalid size.");
  }

  let value;
  try {
    value = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error("Backup manifest is not valid JSON.", { cause: error });
  }
  if (
    !value
    || typeof value !== "object"
    || value.version !== 1
    || value.setName !== expectedSetName
    || !Array.isArray(value.files)
    || value.files.length < 1
  ) {
    throw new Error("Backup manifest is invalid.");
  }

  const relativePaths = value.files.map((entry) => {
    const relativePath = entry?.path;
    if (
      typeof relativePath !== "string"
      || !relativePath
      || relativePath === manifestFileName
      || relativePath.includes("\\")
      || path.posix.isAbsolute(relativePath)
      || relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..")
    ) {
      throw new Error("Backup manifest contains an unsafe file path.");
    }
    return relativePath;
  });
  if (new Set(relativePaths).size !== relativePaths.length) {
    throw new Error("Backup manifest contains duplicate file paths.");
  }
  return relativePaths;
}

function inspectBackupTree(setPath, lstatOperation) {
  const regularFiles = new Set();

  function visit(directoryPath) {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const entryPath = path.join(directoryPath, entry.name);
      if (!isSafeChildPath(setPath, entryPath)) {
        throw new Error("Backup set contains an unsafe path.");
      }
      const stats = lstatOperation(entryPath);
      const type = entryType(stats);
      if (type === "symbolic-link" || entry.isSymbolicLink()) {
        throw new Error("Backup set must not contain a symbolic link.");
      }
      if (type === "directory" && entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (type === "file" && entry.isFile()) {
        assertSingleLinkFile(stats, "Backup file");
        regularFiles.add(path.relative(setPath, entryPath).split(path.sep).join("/"));
        continue;
      }
      throw new Error("Backup set must not contain a special filesystem entry.");
    }
  }

  visit(setPath);
  return regularFiles;
}

function addAncestorDirectories(setPath, relativePath, directories, lstatOperation) {
  const segments = relativePath.split("/");
  segments.pop();
  let currentPath = setPath;
  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    assertRealDirectory(currentPath, "Backup payload ancestor", lstatOperation);
    directories.add(currentPath);
  }
}

function createPlanEntry({ entryPath, kind, uid, gid, mode, lstatOperation }) {
  const stats = kind === "directory"
    ? assertRealDirectory(entryPath, "Backup access directory", lstatOperation)
    : assertRealFile(entryPath, "Backup access file", lstatOperation);
  return {
    path: entryPath,
    kind,
    uid,
    gid,
    mode,
    snapshot: snapshotStats(stats),
  };
}

export function buildBackupHealthAccessPlan({
  backupRoot,
  setName,
  physicalSetName = setName,
  groupId,
  includeRestoreMarker = false,
  lstatOperation = defaultLstatOperation,
}) {
  assertBackupSetName(setName);
  assertValidGroupId(groupId);
  if (!path.isAbsolute(backupRoot)) throw new Error("Backup root must be absolute.");
  assertRealDirectory(backupRoot, "Backup root", lstatOperation);

  const resolvedPhysicalSetName = resolvePhysicalSetName(setName, physicalSetName);
  const setPath = path.join(backupRoot, resolvedPhysicalSetName);
  if (!isSafeChildPath(backupRoot, setPath)) throw new Error("Backup set path is unsafe.");
  assertRealDirectory(setPath, "Backup set", lstatOperation);

  const manifestPath = path.join(setPath, manifestFileName);
  const payloadRelativePaths = parseManifest(manifestPath, setName, lstatOperation);
  const regularFiles = inspectBackupTree(setPath, lstatOperation);
  const expectedFiles = new Set([manifestFileName, ...payloadRelativePaths]);
  if (
    regularFiles.size !== expectedFiles.size
    || [...regularFiles].some((relativePath) => !expectedFiles.has(relativePath))
  ) {
    throw new Error("Backup set contains files that are not declared by its manifest.");
  }

  const directories = new Set([backupRoot, setPath]);
  const payloadEntries = payloadRelativePaths.map((relativePath) => {
    const payloadPath = path.join(setPath, ...relativePath.split("/"));
    if (!isSafeChildPath(setPath, payloadPath)) {
      throw new Error("Backup manifest contains an unsafe file path.");
    }
    assertRealFile(payloadPath, "Backup payload", lstatOperation);
    addAncestorDirectories(setPath, relativePath, directories, lstatOperation);
    return createPlanEntry({
      entryPath: payloadPath,
      kind: "payload",
      uid: 0,
      gid: 0,
      mode: 0o600,
      lstatOperation,
    });
  });

  const metadataEntries = [
    createPlanEntry({
      entryPath: manifestPath,
      kind: "metadata",
      uid: 0,
      gid: groupId,
      mode: 0o640,
      lstatOperation,
    }),
  ];
  if (includeRestoreMarker) {
    const markerPath = path.join(backupRoot, restoreMarkerFileName);
    metadataEntries.push(createPlanEntry({
      entryPath: markerPath,
      kind: "metadata",
      uid: 0,
      gid: groupId,
      mode: 0o640,
      lstatOperation,
    }));
  }

  const directoryEntries = [...directories]
    .sort((left, right) => left.localeCompare(right))
    .map((directoryPath) =>
      createPlanEntry({
        entryPath: directoryPath,
        kind: "directory",
        uid: 0,
        gid: groupId,
        mode: 0o750,
        lstatOperation,
      }),
    );
  return [...payloadEntries, ...metadataEntries, ...directoryEntries];
}

function assertRootExecution(platform, getEuid) {
  if (platform === "win32") return;
  if (typeof getEuid !== "function" || getEuid() !== 0) {
    throw new Error("POSIX backup permission changes must run as root.");
  }
}

function assertEntrySnapshot(entry, lstatOperation) {
  const stats = lstatOperation(entry.path);
  const currentSnapshot = snapshotStats(stats);
  if (
    currentSnapshot.dev !== entry.snapshot.dev
    || currentSnapshot.ino !== entry.snapshot.ino
    || currentSnapshot.type !== entry.snapshot.type
    || (currentSnapshot.type === "file" && currentSnapshot.nlink !== 1)
  ) {
    throw new Error("Backup entry changed after validation.");
  }
  return stats;
}

function assertFinalPermissions(entry, lstatOperation) {
  const stats = assertEntrySnapshot(entry, lstatOperation);
  if (
    Number(stats.uid) !== entry.uid
    || Number(stats.gid) !== entry.gid
    || (Number(stats.mode) & 0o777) !== entry.mode
  ) {
    throw new Error("Backup entry permissions do not match the validated access plan.");
  }
}

export function applyBackupHealthAccessPlan({
  plan,
  platform = process.platform,
  getEuid = typeof process.geteuid === "function" ? () => process.geteuid() : undefined,
  lstatOperation = defaultLstatOperation,
  permissionOperations = { chown: chownSync, chmod: chmodSync },
}) {
  assertRootExecution(platform, getEuid);
  if (platform === "win32") return { applied: false };

  for (const entry of plan) {
    assertEntrySnapshot(entry, lstatOperation);
    permissionOperations.chown(entry.path, entry.uid, entry.gid);
    assertEntrySnapshot(entry, lstatOperation);
    permissionOperations.chmod(entry.path, entry.mode);
  }
  for (const entry of plan) assertFinalPermissions(entry, lstatOperation);
  return { applied: true };
}

export function applyBackupHealthAccess({
  backupRoot,
  setName,
  physicalSetName = setName,
  includeRestoreMarker = false,
  groupId,
  env = process.env,
  platform = process.platform,
  getEuid = typeof process.geteuid === "function" ? () => process.geteuid() : undefined,
  lstatOperation = defaultLstatOperation,
  permissionOperations = { chown: chownSync, chmod: chmodSync },
}) {
  assertBackupSetName(setName);
  const resolvedGroupId = groupId === undefined
    ? resolveBackupHealthGroupId(env.BACKUP_HEALTH_GID, env)
    : assertValidGroupId(groupId);
  if (resolvedGroupId === null) return { applied: false, groupId: null };
  assertRootExecution(platform, getEuid);

  const plan = buildBackupHealthAccessPlan({
    backupRoot,
    setName,
    physicalSetName,
    groupId: resolvedGroupId,
    includeRestoreMarker,
    lstatOperation,
  });
  const result = applyBackupHealthAccessPlan({
    plan,
    platform,
    getEuid,
    lstatOperation,
    permissionOperations,
  });
  return { ...result, groupId: resolvedGroupId };
}

function assertPathMissing(filePath, lstatOperation, label) {
  try {
    lstatOperation(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`${label} already exists.`);
}

export function publishBackupSet({
  backupRoot,
  setName,
  physicalSetName,
  groupId,
  env = process.env,
  platform = process.platform,
  getEuid = typeof process.geteuid === "function" ? () => process.geteuid() : undefined,
  lstatOperation = defaultLstatOperation,
  permissionOperations = { chown: chownSync, chmod: chmodSync },
  renameOperation = renameSync,
}) {
  assertBackupSetName(setName);
  const resolvedPhysicalSetName = resolvePhysicalSetName(setName, physicalSetName);
  if (resolvedPhysicalSetName === setName) {
    throw new Error("Backup publication requires an expected partial set.");
  }
  const finalPath = path.join(backupRoot, setName);
  assertPathMissing(finalPath, lstatOperation, "Final backup set");

  const accessResult = applyBackupHealthAccess({
    backupRoot,
    setName,
    physicalSetName: resolvedPhysicalSetName,
    groupId,
    env,
    platform,
    getEuid,
    lstatOperation,
    permissionOperations,
  });
  renameOperation(path.join(backupRoot, resolvedPhysicalSetName), finalPath);
  return accessResult;
}

function validateRestoreMarker(marker, setName) {
  if (
    !marker
    || typeof marker !== "object"
    || marker.version !== 1
    || marker.backupSet !== setName
    || typeof marker.rehearsedAt !== "string"
    || !Number.isFinite(Date.parse(marker.rehearsedAt))
    || typeof marker.databaseSha256 !== "string"
    || !sha256Pattern.test(marker.databaseSha256)
  ) {
    throw new Error("Restore rehearsal marker is invalid.");
  }
}

export function publishRestoreRehearsalMarker({
  backupRoot,
  setName,
  marker,
  groupId,
  env = process.env,
  platform = process.platform,
  getEuid = typeof process.geteuid === "function" ? () => process.geteuid() : undefined,
  lstatOperation = defaultLstatOperation,
  permissionOperations = { chown: chownSync, chmod: chmodSync },
  processId = process.pid,
}) {
  assertBackupSetName(setName);
  validateRestoreMarker(marker, setName);
  const markerPath = path.join(backupRoot, restoreMarkerFileName);
  try {
    assertRealFile(markerPath, "Existing restore rehearsal marker", lstatOperation);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const setAccessResult = applyBackupHealthAccess({
    backupRoot,
    setName,
    groupId,
    env,
    platform,
    getEuid,
    lstatOperation,
    permissionOperations,
  });

  const partialMarkerName = `.last-restore-rehearsal-${processId}.tmp`;
  if (path.basename(partialMarkerName) !== partialMarkerName || !/^\d+$/.test(String(processId))) {
    throw new Error("Restore rehearsal marker process id is invalid.");
  }
  const partialMarkerPath = path.join(backupRoot, partialMarkerName);
  try {
    writeFileSync(partialMarkerPath, `${JSON.stringify(marker, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    if (setAccessResult.groupId !== null) {
      const markerPlan = [
        createPlanEntry({
          entryPath: partialMarkerPath,
          kind: "metadata",
          uid: 0,
          gid: setAccessResult.groupId,
          mode: 0o640,
          lstatOperation,
        }),
      ];
      applyBackupHealthAccessPlan({
        plan: markerPlan,
        platform,
        getEuid,
        lstatOperation,
        permissionOperations,
      });
    }
    renameSync(partialMarkerPath, markerPath);
  } finally {
    rmSync(partialMarkerPath, { force: true });
  }
  return setAccessResult;
}
