import { createHash } from "node:crypto";

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

export function normalizeRow(row, definition) {
  return Object.fromEntries(Object.keys(definition.columns).sort().map((columnName) => {
    const column = definition.columns[columnName];
    let value = row[columnName];
    if (value === null || value === undefined) return [columnName, null];
    if (["datetime", "timestamp"].includes(column.dataType)) value = normalizeUtcDate(value)?.toISOString() ?? value;
    if (column.dataType === "json") {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      value = canonicalJson(parsed);
    }
    if (["tinyint", "smallint", "mediumint", "int", "bigint", "decimal", "float", "double"].includes(column.dataType)) {
      value = normalizeNumericValue(value);
    }
    return [columnName, value];
  }));
}

export function aggregateChecksum(rows, definition) {
  const primaryKey = definition.primaryKey?.length ? definition.primaryKey : Object.keys(definition.columns);
  const normalized = rows.map((row) => normalizeRow(row, definition));
  normalized.sort((left, right) => compositeKey(left, primaryKey).localeCompare(compositeKey(right, primaryKey)));
  const hash = createHash("sha256");
  for (const row of normalized) hash.update(`${JSON.stringify(row)}\n`);
  return hash.digest("hex");
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
