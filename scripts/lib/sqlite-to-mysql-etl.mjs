import { createHash } from "node:crypto";
import Database from "better-sqlite3";

function normalizedCasefold(value) {
  return String(value).normalize("NFKC").toLocaleLowerCase("en-US");
}

export function buildCaseInsensitiveNameMap(names) {
  const mapped = new Map();
  for (const name of names) {
    const key = normalizedCasefold(name);
    if (mapped.has(key) && mapped.get(key) !== name) {
      throw new Error("Source contains table names that collide under MySQL case folding.");
    }
    mapped.set(key, name);
  }
  return mapped;
}

export function findCaseInsensitiveName(names, expected) {
  return buildCaseInsensitiveNameMap(names).get(normalizedCasefold(expected));
}

function compositeKey(row, columns, casefold = false) {
  return columns.map((column) => {
    const value = row[column];
    if (value === null || value === undefined) return "<NULL>";
    return casefold && typeof value === "string" ? normalizedCasefold(value) : String(value);
  }).join("\u001f");
}

function isStringColumn(column) {
  return ["char", "varchar", "text", "tinytext", "mediumtext", "longtext", "enum"].includes(column.dataType);
}

const MYSQL_BINARY_TYPES = new Set(["binary", "varbinary", "tinyblob", "blob", "mediumblob", "longblob"]);
const MYSQL_HEX_TEXT_TYPES = new Set(["char", "varchar", "text", "tinytext", "mediumtext", "longtext", "enum", "set", "json"]);

export function requiresMysqlHexTransport(column) {
  return MYSQL_BINARY_TYPES.has(column.dataType) || MYSQL_HEX_TEXT_TYPES.has(column.dataType);
}

export function buildMysqlHexSelectExpression(columnName, column) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(columnName)) throw new Error("Unsafe database identifier in ETL metadata.");
  const quoted = `\`${columnName}\``;
  const transportValue = column.dataType === "json"
    ? `CAST(${quoted} AS CHAR CHARACTER SET utf8mb4)`
    : quoted;
  return requiresMysqlHexTransport(column)
    ? `CONCAT('H', CAST(HEX(${transportValue}) AS CHAR CHARACTER SET ascii)) AS ${quoted}`
    : quoted;
}

function mysqlTransportError({ table = "unknown", column, dataType }) {
  return new Error(`ETL received invalid encoded data from MySQL (table=${table}, column=${column}, dataType=${dataType}).`);
}

function decodeHexValue(value, context) {
  let encoded = String(value);
  if (/^0x/i.test(encoded)) {
    const outerHex = encoded.slice(2);
    if (outerHex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(outerHex)) throw mysqlTransportError(context);
    encoded = Buffer.from(outerHex, "hex").toString("ascii");
  }
  if (!encoded.startsWith("H")) throw mysqlTransportError(context);
  const hex = encoded.slice(1);
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw mysqlTransportError(context);
  }
  return Buffer.from(hex, "hex");
}

export function decodeMysqlTransportRow(row, definition, { table = "unknown" } = {}) {
  return Object.fromEntries(Object.entries(row).map(([columnName, value]) => {
    const column = definition.columns[columnName];
    if (value === null || value === undefined || !column || !requiresMysqlHexTransport(column)) {
      return [columnName, value];
    }
    const context = { table, column: columnName, dataType: column.dataType };
    const decoded = decodeHexValue(value, context);
    if (MYSQL_BINARY_TYPES.has(column.dataType)) return [columnName, decoded];
    try {
      return [columnName, new TextDecoder("utf-8", { fatal: true }).decode(decoded)];
    } catch {
      throw mysqlTransportError(context);
    }
  }));
}

export function deriveAiReportAudienceKey(row, canonicalPublic) {
  if (row.userId !== null && row.userId !== undefined) return String(row.userId);
  if (canonicalPublic && ["GLOBAL", "WEEKLY"].includes(row.scope)) return "PUBLIC";
  return `LEGACY:${createHash("sha256").update(String(row.id)).digest("hex")}`;
}

export function iterateAiReportSourceRows(source, sourceTable, { orderBy = [] } = {}) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(sourceTable)) throw new Error("Unsafe database identifier in ETL metadata.");
  if (!orderBy.every((column) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column))) {
    throw new Error("Unsafe database identifier in ETL metadata.");
  }
  const quotedTable = `\`${sourceTable}\``;
  const ordering = orderBy.length > 0 ? ` ORDER BY ${orderBy.map((column) => `source_row.\`${column}\``).join(",")}` : "";
  const rows = source.prepare(`
    SELECT source_row.*,
           CASE
             WHEN source_row.userId IS NULL
              AND source_row.scope IN ('GLOBAL', 'WEEKLY')
              AND source_row.id = (
                SELECT MIN(candidate.id COLLATE NOCASE)
                FROM ${quotedTable} AS candidate
                WHERE candidate.userId IS NULL
                  AND candidate.periodKey = source_row.periodKey
                  AND candidate.scope = source_row.scope
              )
             THEN 1 ELSE 0
           END AS __etlCanonicalPublic
    FROM ${quotedTable} AS source_row${ordering}
  `).iterate();
  return (function* deriveRows() {
    for (const row of rows) {
      const canonicalPublic = Number(row.__etlCanonicalPublic) === 1;
      delete row.__etlCanonicalPublic;
      row.audienceKey = deriveAiReportAudienceKey(row, canonicalPublic);
      yield row;
    }
  }());
}

export function* batchRows(rows, batchSize) {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new Error("ETL batch size must be a positive integer.");
  let batch = [];
  for (const row of rows) {
    batch.push(row);
    if (batch.length === batchSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length > 0) yield batch;
}

export function splitMysqlInsertStatements({ table, prefix, valueTuples, suffix, maxBytes }) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new Error("Unsafe database identifier in ETL metadata.");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("ETL insert byte budget must be a positive integer.");
  const executePrefix = "SET time_zone = '+00:00';\n";
  const render = (tuples) => `START TRANSACTION;\n${prefix}${tuples.join(",")}${suffix};\nCOMMIT;`;
  const withinBudget = (statement) => Buffer.byteLength(`${executePrefix}${statement}\n`, "utf8") <= maxBytes;
  const statements = [];
  let current = [];
  for (const tuple of valueTuples) {
    const candidate = [...current, tuple];
    const candidateStatement = render(candidate);
    if (withinBudget(candidateStatement)) {
      current = candidate;
      continue;
    }
    if (current.length === 0) {
      throw new Error(`ETL insert row exceeds statement byte budget (table=${table}, code=INSERT_ROW_TOO_LARGE).`);
    }
    statements.push(render(current));
    current = [tuple];
    if (!withinBudget(render(current))) {
      throw new Error(`ETL insert row exceeds statement byte budget (table=${table}, code=INSERT_ROW_TOO_LARGE).`);
    }
  }
  if (current.length > 0) statements.push(render(current));
  return statements;
}

function sortedAuditEvents(rows) {
  return [...rows].sort((left, right) => {
    const leftTime = normalizeUtcDate(left.createdAt)?.getTime() ?? Number.NaN;
    const rightTime = normalizeUtcDate(right.createdAt)?.getTime() ?? Number.NaN;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return String(left.id).localeCompare(String(right.id));
  });
}

function auditPayload(value) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

export function deriveAuditChainHeadRows(auditEvents) {
  const ordered = sortedAuditEvents(auditEvents ?? []);
  const lastEvent = ordered.at(-1);
  if (!lastEvent) return [];
  const lastCreatedAt = normalizeUtcDate(lastEvent.createdAt);
  if (!lastCreatedAt) throw new Error("Cannot derive AuditChainHead from an invalid timestamp.");
  return [{
    id: "global",
    lastEventHash: lastEvent.eventHash,
    lastCreatedAt,
    version: ordered.length,
    updatedAt: lastCreatedAt,
  }];
}

export function buildLoadOrder(metadata) {
  const tables = Object.keys(metadata).sort();
  const dependencies = new Map(tables.map((table) => [table, new Set()]));
  for (const table of tables) {
    for (const foreignKey of metadata[table].foreignKeys ?? []) {
      if (foreignKey.referencedTable !== table && dependencies.has(foreignKey.referencedTable)) {
        dependencies.get(table).add(foreignKey.referencedTable);
      }
    }
  }
  const ordered = [];
  while (ordered.length < tables.length) {
    const ready = tables.filter((table) => !ordered.includes(table) && [...dependencies.get(table)].every((item) => ordered.includes(item)));
    if (ready.length === 0) throw new Error("Target foreign keys contain a dependency cycle that requires manual ETL staging.");
    ordered.push(...ready);
  }
  return ordered;
}

export function validateSourceRows(rowsByTable, metadata) {
  const issues = [];
  const tableKeys = new Map();
  for (const [table, definition] of Object.entries(metadata)) {
    const rows = rowsByTable[table] ?? [];
    for (const [columnName, column] of Object.entries(definition.columns)) {
      rows.forEach((row, rowIndex) => {
        const value = row[columnName];
        if ((value === null || value === undefined) && !column.nullable) {
          issues.push({ code: "NULL_REQUIRED", table, column: columnName, rowIndex });
          return;
        }
        if (value === null || value === undefined) return;
        if (column.maxLength !== null && column.maxLength !== undefined && typeof value === "string" && [...value].length > column.maxLength) {
          issues.push({ code: "LENGTH_EXCEEDED", table, column: columnName, rowIndex });
        }
        if (column.dataType === "json") {
          try {
            const parsed = typeof value === "string" ? JSON.parse(value) : value;
            if (parsed === undefined) throw new Error("undefined JSON");
          } catch {
            issues.push({ code: "INVALID_JSON", table, column: columnName, rowIndex });
          }
        }
        if (column.enumValues?.length && !column.enumValues.includes(String(value))) {
          issues.push({ code: "INVALID_ENUM", table, column: columnName, rowIndex });
        }
        if (["datetime", "timestamp"].includes(column.dataType)) {
          const date = normalizeUtcDate(value);
          if (!date || date.getTime() % 1 !== 0 || (column.dateTimePrecision ?? 0) < 3) {
            issues.push({ code: "INVALID_UTC_MILLISECONDS", table, column: columnName, rowIndex });
          }
        }
      });
    }
    for (const uniqueColumns of definition.uniqueIndexes ?? []) {
      const seen = new Set();
      rows.forEach((row, rowIndex) => {
        if (uniqueColumns.some((column) => row[column] === null || row[column] === undefined)) return;
        const shouldCasefold = uniqueColumns.some((column) => isStringColumn(definition.columns[column]));
        const key = compositeKey(row, uniqueColumns, shouldCasefold);
        if (seen.has(key)) issues.push({ code: "CASEFOLD_COLLISION", table, column: uniqueColumns.join(","), rowIndex });
        seen.add(key);
      });
    }
    tableKeys.set(table, rows);
  }
  for (const [table, definition] of Object.entries(metadata)) {
    const rows = rowsByTable[table] ?? [];
    for (const foreignKey of definition.foreignKeys ?? []) {
      const parents = tableKeys.get(foreignKey.referencedTable) ?? [];
      const parentKeys = new Set(parents.map((row) => compositeKey(row, foreignKey.referencedColumns, true)));
      rows.forEach((row, rowIndex) => {
        if (foreignKey.columns.some((column) => row[column] === null || row[column] === undefined)) return;
        if (!parentKeys.has(compositeKey(row, foreignKey.columns, true))) {
          issues.push({ code: "MISSING_FOREIGN_KEY", table, column: foreignKey.columns.join(","), rowIndex });
        }
      });
    }
  }
  const auditEventTable = findCaseInsensitiveName(Object.keys(rowsByTable), "AuditEvent");
  if (auditEventTable && Array.isArray(rowsByTable[auditEventTable])) {
    let previousHash = null;
    for (const [rowIndex, event] of sortedAuditEvents(rowsByTable[auditEventTable]).entries()) {
      const createdAt = normalizeUtcDate(event.createdAt);
      if (!createdAt) continue;
      let payload;
      try {
        payload = auditPayload(event.payload);
      } catch {
        continue;
      }
      const expectedHash = createHash("sha256").update(JSON.stringify(canonicalJson({
        previousHash,
        category: event.category,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        actorUserId: event.actorUserId ?? null,
        payload,
        createdAt: createdAt.toISOString(),
      }))).digest("hex");
      if (event.previousHash !== previousHash || event.eventHash !== expectedHash) {
        issues.push({ code: "INVALID_AUDIT_CHAIN", table: auditEventTable, column: "eventHash", rowIndex });
      }
      previousHash = event.eventHash;
    }
  }
  return issues;
}

function addIssue(issueCounts, issueLocations, code, table, column, count = 1) {
  issueCounts[code] = (issueCounts[code] ?? 0) + count;
  const key = `${code}\u001f${table}\u001f${column}`;
  const location = issueLocations.get(key) ?? { code, table, column, count: 0 };
  location.count += count;
  issueLocations.set(key, location);
}

function normalizeVipPaymentProvider(value = "PARAM") {
  return String(value ?? "PARAM").trim().toUpperCase().replaceAll(/[^A-Z0-9_-]/g, "").slice(0, 24) || "PARAM";
}

function canonicalizeVipPaymentReference(value, provider = "PARAM") {
  const normalizedProvider = normalizeVipPaymentProvider(provider);
  const compact = String(value ?? "").trim().replaceAll(/\s+/g, "").toUpperCase();
  const reference = compact.startsWith(`${normalizedProvider}:`)
    ? compact.slice(normalizedProvider.length + 1)
    : compact;
  return `${normalizedProvider}:${reference.slice(0, 100)}`;
}

function privateDigest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function validatePaymentVipDomain({ metadata, rowsForTable, now = new Date() }) {
  const paymentTable = findCaseInsensitiveName(Object.keys(metadata), "VipSubscriptionPayment");
  const claimTable = findCaseInsensitiveName(Object.keys(metadata), "VipSubscriptionClaim");
  const userTable = findCaseInsensitiveName(Object.keys(metadata), "User");
  if (!paymentTable || !claimTable || !userTable) return { issueCounts: {}, issueLocations: [] };

  const issueCounts = {};
  const issueLocations = new Map();
  const store = new Database("");
  store.pragma("cache_size = -4096");
  store.pragma("journal_mode = OFF");
  store.pragma("synchronous = OFF");
  store.exec(`
    CREATE TABLE payment_bindings (
      reference_hash TEXT NOT NULL PRIMARY KEY,
      user_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      binding_count INTEGER NOT NULL
    ) WITHOUT ROWID;
    CREATE TABLE active_entitlements (
      user_hash TEXT NOT NULL PRIMARY KEY,
      paid_until TEXT NOT NULL
    ) WITHOUT ROWID;
  `);
  const getBinding = store.prepare("SELECT user_hash, status, binding_count FROM payment_bindings WHERE reference_hash = ?");
  const addBinding = store.prepare("INSERT INTO payment_bindings (reference_hash, user_hash, status, binding_count) VALUES (?, ?, ?, 1)");
  const incrementBinding = store.prepare("UPDATE payment_bindings SET binding_count = binding_count + 1 WHERE reference_hash = ?");
  const getEntitlement = store.prepare("SELECT paid_until FROM active_entitlements WHERE user_hash = ?");
  const addEntitlement = store.prepare("INSERT INTO active_entitlements (user_hash, paid_until) VALUES (?, ?)");
  const updateEntitlement = store.prepare("UPDATE active_entitlements SET paid_until = ? WHERE user_hash = ?");
  const allowedStatuses = new Set(["PAID", "REFUNDED", "CHARGEBACK", "REVOKED"]);
  let paymentCount = 0;
  let claimCount = 0;
  try {
    for (const payment of rowsForTable(paymentTable)) {
      paymentCount += 1;
      const status = String(payment.status ?? "");
      if (!allowedStatuses.has(status)) addIssue(issueCounts, issueLocations, "INVALID_PAYMENT_STATUS", paymentTable, "status");
      if (normalizeDecimalValue(payment.amountTry, 30, 8) !== "100.00000000") {
        addIssue(issueCounts, issueLocations, "INVALID_PAYMENT_AMOUNT", paymentTable, "amountTry");
      }
      if (payment.currency !== "TRY") addIssue(issueCounts, issueLocations, "INVALID_PAYMENT_CURRENCY", paymentTable, "currency");

      const paidAt = normalizeUtcDate(payment.paidAt);
      const paidUntil = normalizeUtcDate(payment.paidUntil);
      if (!paidAt || !paidUntil || paidAt.getTime() >= paidUntil.getTime()) {
        addIssue(issueCounts, issueLocations, "INVALID_PAYMENT_GRANT_WINDOW", paymentTable, "paidAt,paidUntil");
      }

      const referenceHash = privateDigest(canonicalizeVipPaymentReference(payment.providerReference, payment.provider));
      const userHash = privateDigest(payment.userId);
      const existingBinding = getBinding.get(referenceHash);
      if (existingBinding) {
        incrementBinding.run(referenceHash);
        addIssue(issueCounts, issueLocations, "CANONICAL_PAYMENT_REFERENCE_COLLISION", paymentTable, "provider,providerReference");
      } else {
        addBinding.run(referenceHash, userHash, status);
      }

      if (status === "PAID" && payment.revokedAt === null && paidUntil && paidUntil.getTime() > now.getTime()) {
        const existingEntitlement = getEntitlement.get(userHash);
        const paidUntilIso = paidUntil.toISOString();
        if (!existingEntitlement) addEntitlement.run(userHash, paidUntilIso);
        else if (paidUntilIso > existingEntitlement.paid_until) updateEntitlement.run(paidUntilIso, userHash);
      }
    }

    for (const claim of rowsForTable(claimTable)) {
      claimCount += 1;
      if (claim.status !== "APPROVED") continue;
      const referenceHash = privateDigest(canonicalizeVipPaymentReference(claim.providerReference, claim.provider));
      const binding = getBinding.get(referenceHash);
      if (!binding || binding.binding_count !== 1 || binding.status !== "PAID" || binding.user_hash !== privateDigest(claim.userId)) {
        addIssue(issueCounts, issueLocations, "APPROVED_CLAIM_PAYMENT_MISMATCH", claimTable, "provider,providerReference,userId");
      }
    }

    if (paymentCount === 0 && claimCount === 0) return { issueCounts: {}, issueLocations: [] };

    for (const user of rowsForTable(userTable)) {
      const entitlement = getEntitlement.get(privateDigest(user.id));
      const vipPaidUntil = normalizeUtcDate(user.vipPaidUntil);
      const matches = entitlement
        ? user.membershipTier === "VIP" && vipPaidUntil?.toISOString() === entitlement.paid_until
        : user.membershipTier === "STANDARD" && (user.vipPaidUntil === null || user.vipPaidUntil === undefined);
      if (!matches) addIssue(issueCounts, issueLocations, "VIP_LEDGER_STATE_MISMATCH", userTable, "membershipTier,vipPaidUntil");
    }

    return {
      issueCounts,
      issueLocations: [...issueLocations.values()].sort((left, right) => (
        left.code.localeCompare(right.code) || left.table.localeCompare(right.table) || left.column.localeCompare(right.column)
      )),
    };
  } finally {
    store.close();
  }
}

function validateColumns(row, table, definition, issueCounts, issueLocations) {
  for (const [columnName, column] of Object.entries(definition.columns)) {
    const value = row[columnName];
    if ((value === null || value === undefined) && !column.nullable) {
      addIssue(issueCounts, issueLocations, "NULL_REQUIRED", table, columnName);
      continue;
    }
    if (value === null || value === undefined) continue;
    if (column.maxLength !== null && column.maxLength !== undefined && typeof value === "string" && [...value].length > column.maxLength) {
      addIssue(issueCounts, issueLocations, "LENGTH_EXCEEDED", table, columnName);
    }
    if (column.dataType === "json") {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (parsed === undefined) throw new Error("undefined JSON");
      } catch {
        addIssue(issueCounts, issueLocations, "INVALID_JSON", table, columnName);
      }
    }
    if (column.enumValues?.length && !column.enumValues.includes(String(value))) {
      addIssue(issueCounts, issueLocations, "INVALID_ENUM", table, columnName);
    }
    if (column.dataType === "decimal" && Number.isInteger(column.numericPrecision) && Number.isInteger(column.numericScale)) {
      if (normalizeDecimalValue(value, column.numericPrecision, column.numericScale) === null) {
        addIssue(issueCounts, issueLocations, "DECIMAL_OUT_OF_RANGE", table, columnName);
      }
    }
    if (["datetime", "timestamp"].includes(column.dataType)) {
      const date = normalizeUtcDate(value);
      if (!date || date.getTime() % 1 !== 0 || (column.dateTimePrecision ?? 0) < 3) {
        addIssue(issueCounts, issueLocations, "INVALID_UTC_MILLISECONDS", table, columnName);
      }
    }
  }
}

function keyDigest(row, columns, casefold) {
  return createHash("sha256").update(compositeKey(row, columns, casefold)).digest("hex");
}

export function validateSourceStreams({ metadata, rowsForTable, auditEventTable = undefined, now = new Date() }) {
  const issueCounts = {};
  const issueLocations = new Map();
  const keys = new Database("");
  keys.pragma("cache_size = -4096");
  keys.pragma("journal_mode = OFF");
  keys.pragma("synchronous = OFF");
  keys.exec(`
    CREATE TABLE validation_keys (
      scope TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      PRIMARY KEY (scope, key_hash)
    ) WITHOUT ROWID;
    CREATE TABLE foreign_key_children (
      scope TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      PRIMARY KEY (scope, key_hash)
    ) WITHOUT ROWID;
  `);
  const addKey = keys.prepare("INSERT OR IGNORE INTO validation_keys (scope, key_hash) VALUES (?, ?)");
  const addChildKey = keys.prepare(`
    INSERT INTO foreign_key_children (scope, key_hash, row_count) VALUES (?, ?, 1)
    ON CONFLICT (scope, key_hash) DO UPDATE SET row_count = row_count + 1
  `);
  const countMissingChildren = keys.prepare(`
    SELECT COALESCE(SUM(child.row_count), 0) AS missing_count
    FROM foreign_key_children AS child
    LEFT JOIN validation_keys AS parent
      ON parent.scope = child.scope AND parent.key_hash = child.key_hash
    WHERE child.scope = ? AND parent.key_hash IS NULL
  `);
  try {
    const incomingForeignKeys = new Map(Object.keys(metadata).map((table) => [table, []]));
    for (const [table, definition] of Object.entries(metadata)) {
      (definition.foreignKeys ?? []).forEach((foreignKey, foreignKeyIndex) => {
        incomingForeignKeys.get(foreignKey.referencedTable)?.push({
          scope: `fk:${table}:${foreignKeyIndex}`,
          columns: foreignKey.referencedColumns,
        });
      });
    }
    for (const [table, definition] of Object.entries(metadata)) {
      const uniqueIndexes = definition.uniqueIndexes ?? [];
      for (const row of rowsForTable(table)) {
        validateColumns(row, table, definition, issueCounts, issueLocations);
        uniqueIndexes.forEach((columns, index) => {
          if (columns.some((column) => row[column] === null || row[column] === undefined)) return;
          const casefold = columns.some((column) => isStringColumn(definition.columns[column]));
          const result = addKey.run(`unique:${table}:${index}`, keyDigest(row, columns, casefold));
          if (result.changes === 0) addIssue(issueCounts, issueLocations, "CASEFOLD_COLLISION", table, columns.join(","));
        });
        for (const incoming of incomingForeignKeys.get(table) ?? []) {
          addKey.run(incoming.scope, keyDigest(row, incoming.columns, true));
        }
        (definition.foreignKeys ?? []).forEach((foreignKey, foreignKeyIndex) => {
          if (foreignKey.columns.some((column) => row[column] === null || row[column] === undefined)) return;
          addChildKey.run(`fk:${table}:${foreignKeyIndex}`, keyDigest(row, foreignKey.columns, true));
        });
      }
    }

    for (const [table, definition] of Object.entries(metadata)) {
      for (const [foreignKeyIndex, foreignKey] of (definition.foreignKeys ?? []).entries()) {
        const scope = `fk:${table}:${foreignKeyIndex}`;
        const missingCount = Number(countMissingChildren.get(scope).missing_count);
        if (missingCount > 0) {
          addIssue(issueCounts, issueLocations, "MISSING_FOREIGN_KEY", table, foreignKey.columns.join(","), missingCount);
        }
      }
    }

    let auditChainHeadRows = [];
    if (auditEventTable) {
      let previousHash = null;
      let lastEvent = null;
      let version = 0;
      for (const event of rowsForTable(auditEventTable, { auditOrder: true })) {
        version += 1;
        lastEvent = event;
        const createdAt = normalizeUtcDate(event.createdAt);
        if (!createdAt) continue;
        let payload;
        try {
          payload = auditPayload(event.payload);
        } catch {
          continue;
        }
        const expectedHash = createHash("sha256").update(JSON.stringify(canonicalJson({
          previousHash,
          category: event.category,
          entityType: event.entityType,
          entityId: event.entityId,
          action: event.action,
          actorUserId: event.actorUserId ?? null,
          payload,
          createdAt: createdAt.toISOString(),
        }))).digest("hex");
        if (event.previousHash !== previousHash || event.eventHash !== expectedHash) {
          addIssue(issueCounts, issueLocations, "INVALID_AUDIT_CHAIN", auditEventTable, "eventHash");
        }
        previousHash = event.eventHash;
      }
      const lastCreatedAt = normalizeUtcDate(lastEvent?.createdAt);
      if (lastEvent && lastCreatedAt) {
        auditChainHeadRows = [{
          id: "global",
          lastEventHash: lastEvent.eventHash,
          lastCreatedAt,
          version,
          updatedAt: lastCreatedAt,
        }];
      }
    }
    const paymentValidation = validatePaymentVipDomain({ metadata, rowsForTable, now });
    for (const [code, count] of Object.entries(paymentValidation.issueCounts)) {
      issueCounts[code] = (issueCounts[code] ?? 0) + count;
    }
    for (const location of paymentValidation.issueLocations) {
      const key = `${location.code}\u001f${location.table}\u001f${location.column}`;
      const aggregate = issueLocations.get(key) ?? { ...location, count: 0 };
      aggregate.count += location.count;
      issueLocations.set(key, aggregate);
    }
    return {
      issueCounts,
      issueLocations: [...issueLocations.values()].sort((left, right) => (
        left.code.localeCompare(right.code) || left.table.localeCompare(right.table) || left.column.localeCompare(right.column)
      )),
      auditChainHeadRows,
    };
  } finally {
    keys.close();
  }
}

export function normalizeUtcDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "number" || (typeof value === "string" && /^-?\d+$/.test(value))) {
    const numeric = Number(value);
    const date = new Date(numeric);
    return Number.isSafeInteger(numeric) && Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value !== "string") return null;
  const normalized = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d{1,3})?$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  if (!/(?:Z|[+-]\d\d:\d\d)$/.test(normalized)) return null;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function prepareCanonicalJson(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed === undefined) throw new Error("undefined JSON");
    const normalizedValue = canonicalJson(parsed);
    return { canonical: JSON.stringify(normalizedValue), normalizedValue };
  } catch {
    throw new Error("ETL encountered invalid JSON during MySQL canonicalization.");
  }
}

export function canonicalizeJsonForMysql(value) {
  return prepareCanonicalJson(value).canonical;
}

export function mysqlCanonicalJsonExpression(value) {
  const canonical = canonicalizeJsonForMysql(value);
  return `CONVERT(X'${Buffer.from(canonical, "utf8").toString("hex")}' USING utf8mb4)`;
}

function scanJsonNumberTokens(json, visit) {
  let index = 0;
  while (index < json.length) {
    if (json[index] === '"') {
      index += 1;
      while (index < json.length) {
        if (json[index] === "\\") {
          index += 2;
          continue;
        }
        if (json[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (json[index] === "-" || /[0-9]/.test(json[index])) {
      const match = json.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (match) {
        visit(match[0]);
        index += match[0].length;
        continue;
      }
    }
    index += 1;
  }
}

function exactDecimalShape(token) {
  const match = String(token).match(/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) throw new Error("ETL encountered an unsupported JSON number.");
  const exponent = Number(match[4] ?? 0);
  if (!Number.isSafeInteger(exponent)) throw new Error("ETL encountered an unsupported JSON number.");
  let digits = `${match[2]}${match[3] ?? ""}`.replace(/^0+/, "") || "0";
  let scale = (match[3]?.length ?? 0) - exponent;
  if (scale < 0) {
    digits += "0".repeat(-scale);
    scale = 0;
  }
  while (digits.length > 1 && digits.endsWith("0") && scale > 0) {
    digits = digits.slice(0, -1);
    scale -= 1;
  }
  const zero = /^0+$/.test(digits);
  return { negative: match[1] === "-" && !zero, negativeZero: match[1] === "-" && zero, digits, scale };
}

function sameExactDecimal(left, right) {
  return left.negative === right.negative && left.digits === right.digits && left.scale === right.scale;
}

function plainDecimal(shape) {
  const sign = shape.negative ? "-" : "";
  if (shape.scale === 0) return `${sign}${shape.digits}`;
  if (shape.digits.length <= shape.scale) {
    return `${sign}0.${"0".repeat(shape.scale - shape.digits.length)}${shape.digits}`;
  }
  return `${sign}${shape.digits.slice(0, -shape.scale)}.${shape.digits.slice(-shape.scale)}`;
}

function mysqlUtf8Expression(value, characterSet = "utf8mb4") {
  return `CONVERT(X'${Buffer.from(String(value), "utf8").toString("hex")}' USING ${characterSet})`;
}

function mysqlExactDecimalExpression(value) {
  if (!Number.isFinite(value) || Object.is(value, -0) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
    throw new Error("ETL cannot losslessly represent a JSON number in MySQL.");
  }
  if (Number.isInteger(value)) return null;
  const shape = exactDecimalShape(JSON.stringify(value));
  const integerDigits = Math.max(0, shape.digits.length - shape.scale);
  const precision = Math.max(1, integerDigits + shape.scale);
  if (precision > 65 || shape.scale > 30) {
    throw new Error("ETL cannot losslessly represent a JSON number in MySQL DECIMAL.");
  }
  return `CAST(${mysqlUtf8Expression(plainDecimal(shape), "ascii")} AS DECIMAL(${precision},${shape.scale}))`;
}

function collectJsonDecimalReplacements(value, path, replacements) {
  if (typeof value === "number") {
    const expression = mysqlExactDecimalExpression(value);
    if (expression) replacements.push({ path, expression });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectJsonDecimalReplacements(item, `${path}[${index}]`, replacements));
    return;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value).sort()) {
      collectJsonDecimalReplacements(value[key], `${path}.${JSON.stringify(key)}`, replacements);
    }
  }
}

export function prepareLosslessJsonForMysql(value) {
  if (typeof value === "string") {
    scanJsonNumberTokens(value, (token) => {
      const numeric = Number(token);
      if (!Number.isFinite(numeric)) throw new Error("ETL cannot losslessly represent a JSON number in MySQL.");
      const sourceShape = exactDecimalShape(token);
      if (sourceShape.negativeZero || (Number.isInteger(numeric) && !Number.isSafeInteger(numeric))) {
        throw new Error("ETL cannot losslessly represent a JSON number in MySQL.");
      }
      if (!sameExactDecimal(sourceShape, exactDecimalShape(JSON.stringify(numeric)))) {
        throw new Error("ETL cannot losslessly parse a JSON number with JavaScript semantics.");
      }
    });
  }
  const { canonical, normalizedValue } = prepareCanonicalJson(value);
  const replacements = [];
  collectJsonDecimalReplacements(normalizedValue, "$", replacements);
  // MySQL's JSON text parser stores fractional tokens through its DOUBLE path,
  // whose serialized value can differ from the source binary64 value. Build the
  // document normally, then promote each fraction to an exact JSON DECIMAL.
  let expression = mysqlUtf8Expression(canonical);
  for (let offset = 0; offset < replacements.length; offset += 32) {
    const chunk = replacements.slice(offset, offset + 32);
    expression = `JSON_SET(${expression},${chunk.map((replacement) => (
      `${mysqlUtf8Expression(replacement.path)},${replacement.expression}`
    )).join(",")})`;
  }
  return { expression, normalizedValue };
}

export function mysqlLosslessJsonExpression(value) {
  return prepareLosslessJsonForMysql(value).expression;
}

function jsonValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value === "object" ? "object" : typeof value;
}

function canonicalJsonFingerprint(value) {
  return JSON.stringify(canonicalJson(value));
}

function incrementJsonCategory(counts, category) {
  counts[category] = (counts[category] ?? 0) + 1;
}

function classifyJsonDifference(source, staged, counts) {
  if (canonicalJsonFingerprint(source) === canonicalJsonFingerprint(staged)) return;
  const sourceType = jsonValueType(source);
  const stagedType = jsonValueType(staged);
  if (sourceType !== stagedType) {
    incrementJsonCategory(counts, "value-type");
    return;
  }
  if (sourceType === "number") {
    incrementJsonCategory(counts, "numeric");
    return;
  }
  if (sourceType === "string") {
    incrementJsonCategory(counts, "string");
    return;
  }
  if (sourceType === "boolean") {
    incrementJsonCategory(counts, "boolean");
    return;
  }
  if (sourceType === "array") {
    if (source.length !== staged.length) incrementJsonCategory(counts, "array-length");
    if (
      source.length === staged.length
      && source.map(canonicalJsonFingerprint).sort().join("\u001f") === staged.map(canonicalJsonFingerprint).sort().join("\u001f")
    ) {
      incrementJsonCategory(counts, "array-order");
      return;
    }
    const sharedLength = Math.min(source.length, staged.length);
    for (let index = 0; index < sharedLength; index += 1) {
      classifyJsonDifference(source[index], staged[index], counts);
    }
    return;
  }
  if (sourceType === "object") {
    const sourceKeys = Object.keys(source).sort();
    const stagedKeys = Object.keys(staged).sort();
    if (JSON.stringify(sourceKeys) !== JSON.stringify(stagedKeys)) incrementJsonCategory(counts, "object-key-set");
    const stagedKeySet = new Set(stagedKeys);
    for (const key of sourceKeys) {
      if (stagedKeySet.has(key)) classifyJsonDifference(source[key], staged[key], counts);
    }
  }
}

function parseJsonForComparison(value) {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

export function categorizeJsonColumnDifferences({ sourceRows, stagedRows, definition }) {
  const jsonColumns = Object.entries(definition.columns)
    .filter(([, column]) => column.dataType === "json")
    .map(([column]) => column)
    .sort();
  const primaryKey = definition.primaryKey ?? [];
  const primaryKeyDefinition = {
    columns: Object.fromEntries(primaryKey.map((column) => [column, definition.columns[column]])),
  };
  const counts = Object.fromEntries(jsonColumns.map((column) => [column, {}]));
  const sourceIterator = sourceRows[Symbol.iterator]();
  const stagedIterator = stagedRows[Symbol.iterator]();
  while (true) {
    const source = sourceIterator.next();
    const staged = stagedIterator.next();
    if (source.done && staged.done) break;
    if (source.done || staged.done) {
      for (const column of jsonColumns) incrementJsonCategory(counts[column], "row-alignment");
      continue;
    }
    const sourceKey = JSON.stringify(normalizeRow(source.value, primaryKeyDefinition));
    const stagedKey = JSON.stringify(normalizeRow(staged.value, primaryKeyDefinition));
    if (sourceKey !== stagedKey) {
      for (const column of jsonColumns) incrementJsonCategory(counts[column], "row-alignment");
      continue;
    }
    for (const column of jsonColumns) {
      try {
        classifyJsonDifference(
          parseJsonForComparison(source.value[column]),
          parseJsonForComparison(staged.value[column]),
          counts[column],
        );
      } catch {
        incrementJsonCategory(counts[column], "invalid-json");
      }
    }
  }
  return jsonColumns.flatMap((column) => Object.entries(counts[column])
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, count]) => ({ column, category, count })));
}

export function normalizeNumericValue(value) {
  const raw = String(value).trim();
  const match = raw.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if (!match) return raw;
  const sign = match[1] === "-" ? "-" : "";
  const integerDigits = match[2];
  const fractionDigits = match[3] ?? "";
  const exponent = Number(match[4] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1_000) return raw;
  const digits = `${integerDigits}${fractionDigits}`;
  const decimalPosition = integerDigits.length + exponent;
  let integerPart;
  let fractionPart;
  if (decimalPosition <= 0) {
    integerPart = "0";
    fractionPart = `${"0".repeat(-decimalPosition)}${digits}`;
  } else if (decimalPosition >= digits.length) {
    integerPart = `${digits}${"0".repeat(decimalPosition - digits.length)}`;
    fractionPart = "";
  } else {
    integerPart = digits.slice(0, decimalPosition);
    fractionPart = digits.slice(decimalPosition);
  }
  integerPart = integerPart.replace(/^0+(?=\d)/, "");
  fractionPart = fractionPart.replace(/0+$/, "");
  const isZero = /^0+$/.test(integerPart) && fractionPart.length === 0;
  return `${isZero ? "" : sign}${integerPart}${fractionPart ? `.${fractionPart}` : ""}`;
}

export function normalizeDecimalValue(value, precision, scale) {
  if (!Number.isSafeInteger(precision) || !Number.isSafeInteger(scale) || precision < 1 || scale < 0 || scale > precision) return null;
  const normalized = normalizeNumericValue(value);
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const negative = match[1] === "-";
  const integer = match[2].replace(/^0+(?=\d)/, "");
  const fraction = match[3] ?? "";
  const paddedFraction = fraction.padEnd(scale + 1, "0");
  const retainedFraction = paddedFraction.slice(0, scale);
  let unscaled = BigInt(`${integer}${retainedFraction}` || "0");
  if (paddedFraction[scale] >= "5") unscaled += 1n;
  const digits = unscaled.toString().padStart(scale + 1, "0");
  const integerDigits = scale === 0 ? digits : digits.slice(0, -scale);
  if (integerDigits.length > precision - scale) return null;
  const fractionDigits = scale === 0 ? "" : digits.slice(-scale);
  const sign = negative && unscaled !== 0n ? "-" : "";
  return `${sign}${integerDigits}${scale === 0 ? "" : `.${fractionDigits}`}`;
}

export function normalizeRow(row, definition, { preparedJsonValues = undefined, table = "unknown" } = {}) {
  return Object.fromEntries(Object.keys(definition.columns).sort().map((columnName) => {
    const column = definition.columns[columnName];
    let value = row[columnName];
    if (value === null || value === undefined) return [columnName, null];
    if (["datetime", "timestamp"].includes(column.dataType)) value = normalizeUtcDate(value)?.toISOString() ?? value;
    if (column.dataType === "json") {
      if (preparedJsonValues && Object.hasOwn(preparedJsonValues, columnName)) {
        value = preparedJsonValues[columnName];
      } else {
        let parsed;
        try {
          parsed = typeof value === "string" ? JSON.parse(value) : value;
        } catch {
          throw new Error(
            `ETL encountered invalid JSON during checksum normalization. (table=${table}, column=${columnName}, category=invalid-json)`,
          );
        }
        value = canonicalJson(parsed);
      }
    }
    if (column.dataType === "decimal" && Number.isInteger(column.numericPrecision) && Number.isInteger(column.numericScale)) {
      value = normalizeDecimalValue(value, column.numericPrecision, column.numericScale) ?? value;
    } else if (["tinyint", "smallint", "mediumint", "int", "bigint", "decimal", "float", "double"].includes(column.dataType)) {
      value = normalizeNumericValue(value);
    }
    return [columnName, value];
  }));
}

export function createAggregateChecksum(definition, { table = "unknown" } = {}) {
  const modulus = 1n << 256n;
  let sum = 0n;
  let count = 0n;
  let finalized = false;
  const addNormalized = (normalizedRow) => {
    if (finalized) throw new Error("Aggregate checksum has already been finalized.");
    const digest = createHash("sha256").update(`${JSON.stringify(normalizedRow)}\n`).digest("hex");
    sum = (sum + BigInt(`0x${digest}`)) % modulus;
    count += 1n;
  };
  return {
    update(row) {
      addNormalized(normalizeRow(row, definition, { table }));
    },
    updateNormalized(normalizedRow) {
      addNormalized(normalizedRow);
    },
    digest() {
      if (finalized) throw new Error("Aggregate checksum has already been finalized.");
      finalized = true;
      const sumHex = sum.toString(16).padStart(64, "0");
      return createHash("sha256").update(`${count.toString()}:${sumHex}`).digest("hex");
    },
  };
}

export function aggregateChecksumFromRows(rows, definition, options = {}) {
  const checksum = createAggregateChecksum(definition, options);
  for (const row of rows) checksum.update(row);
  return checksum.digest();
}

export function aggregateChecksum(rows, definition) {
  return aggregateChecksumFromRows(rows, definition);
}

export function createAggregateSummary(definition, { table = "unknown" } = {}) {
  const tableChecksum = createAggregateChecksum(definition, { table });
  const columnChecksums = Object.fromEntries(Object.keys(definition.columns).sort().map((column) => [
    column,
    createAggregateChecksum({ columns: { [column]: definition.columns[column] } }, { table }),
  ]));
  let count = 0;
  let finalized = false;
  return {
    update(row) {
      if (finalized) throw new Error("Aggregate summary has already been finalized.");
      tableChecksum.update(row);
      for (const [column, checksum] of Object.entries(columnChecksums)) {
        checksum.update({ [column]: row[column] });
      }
      count += 1;
    },
    digest() {
      if (finalized) throw new Error("Aggregate summary has already been finalized.");
      finalized = true;
      return {
        count,
        checksum: tableChecksum.digest(),
        columns: Object.fromEntries(Object.entries(columnChecksums).map(([column, checksum]) => [
          column,
          { count, checksum: checksum.digest() },
        ])),
      };
    },
  };
}

export function summarizeRowsWithColumns(rows, definition, options = {}) {
  const summary = createAggregateSummary(definition, options);
  for (const row of rows) summary.update(row);
  return summary.digest();
}

export function formatAggregateReconciliation(reconciliation) {
  return JSON.stringify({
    version: 1,
    tables: reconciliation.map((row) => ({
      table: row.table,
      sourceCount: row.sourceCount,
      targetCount: row.targetCount,
      sourceChecksum: row.sourceChecksum,
      targetChecksum: row.targetChecksum,
      matched: row.sourceCount === row.targetCount && row.sourceChecksum === row.targetChecksum,
    })),
  });
}

export function formatEtlProgress({ table, category, count }) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new Error("Unsafe ETL progress table name.");
  if (!/^[a-z][a-z0-9-]*$/.test(category)) throw new Error("Unsafe ETL progress category.");
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid ETL progress count.");
  return JSON.stringify({ version: 1, etlProgress: { table, category, count } });
}

export function formatStagingMismatchDiagnostics(comparisons) {
  const tables = comparisons.map(({ table, source, staged, jsonDifferenceCategories = [] }) => {
    const columns = Object.keys(source.columns ?? {}).sort();
    return {
      table,
      sourceCount: source.count,
      stagedCount: staged.count,
      countMatch: source.count === staged.count,
      checksumMatch: source.checksum === staged.checksum,
      jsonDifferenceCategories,
      mismatchedColumns: columns.filter((column) => (
        !staged.columns?.[column]
        || source.columns[column].count !== staged.columns[column].count
        || source.columns[column].checksum !== staged.columns[column].checksum
      )).map((column) => ({
        column,
        sourceCount: source.columns[column].count,
        stagedCount: staged.columns[column]?.count ?? 0,
        countMatch: source.columns[column].count === staged.columns[column]?.count,
        checksumMatch: source.columns[column].checksum === staged.columns[column]?.checksum,
      })),
    };
  });
  return JSON.stringify({
    version: 1,
    stagingReconciliation: tables.every((table) => table.countMatch && table.checksumMatch) ? "matched" : "failed",
    tables,
  });
}

export function formatValidationFailure({ issueCounts, issueLocations }) {
  return JSON.stringify({
    version: 1,
    validation: "failed",
    issueCounts: Object.fromEntries(Object.entries(issueCounts).sort(([left], [right]) => left.localeCompare(right))),
    issueLocations: issueLocations.map(({ code, table, column, count }) => ({ code, table, column, count })),
  });
}
