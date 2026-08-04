#!/usr/bin/env node
import path from "node:path";

import Database from "better-sqlite3";

import { createMysqlCli, mysqlLiteral } from "./lib/mysql-cli.mjs";
import {
  aggregateChecksum,
  buildCaseInsensitiveNameMap,
  buildLoadOrder,
  deriveAuditChainHeadRows,
  formatAggregateReconciliation,
  normalizeUtcDate,
  validateSourceRows,
} from "./lib/sqlite-to-mysql-etl.mjs";
import { loadLocalEnvironment } from "./lib/operations.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error("Unsafe database identifier in ETL metadata.");
  return `\`${value}\``;
}

function enumValues(columnType) {
  if (!columnType?.startsWith("enum(")) return [];
  const values = [];
  for (const match of columnType.matchAll(/'((?:''|[^'])*)'/g)) values.push(match[1].replaceAll("''", "'"));
  return values;
}

function loadTargetMetadata(mysql) {
  const columns = mysql.query(`
    SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType,
           COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable,
           CHARACTER_MAXIMUM_LENGTH AS maxLength, DATETIME_PRECISION AS dateTimePrecision,
           ORDINAL_POSITION AS ordinalPosition
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const indexes = mysql.query(`
    SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique,
           COLUMN_NAME AS columnName, SEQ_IN_INDEX AS sequenceInIndex
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
  `);
  const foreignKeys = mysql.query(`
    SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName, COLUMN_NAME AS columnName,
           REFERENCED_TABLE_NAME AS referencedTable, REFERENCED_COLUMN_NAME AS referencedColumn,
           ORDINAL_POSITION AS ordinalPosition
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION
  `);
  const metadata = {};
  for (const row of columns) {
    if (row.tableName === "_prisma_migrations") continue;
    metadata[row.tableName] ??= { columns: {}, primaryKey: [], uniqueIndexes: [], foreignKeys: [] };
    metadata[row.tableName].columns[row.columnName] = {
      dataType: row.dataType,
      nullable: row.isNullable === "YES",
      maxLength: row.maxLength === null ? null : Number(row.maxLength),
      dateTimePrecision: row.dateTimePrecision === null ? null : Number(row.dateTimePrecision),
      enumValues: enumValues(row.columnType),
      ordinalPosition: Number(row.ordinalPosition),
    };
  }
  const groupedIndexes = new Map();
  for (const row of indexes) {
    if (!metadata[row.tableName]) continue;
    const key = `${row.tableName}\u001f${row.indexName}`;
    if (!groupedIndexes.has(key)) groupedIndexes.set(key, { ...row, columns: [] });
    groupedIndexes.get(key).columns.push(row.columnName);
  }
  for (const index of groupedIndexes.values()) {
    if (index.indexName === "PRIMARY") metadata[index.tableName].primaryKey = index.columns;
    if (index.nonUnique === "0") metadata[index.tableName].uniqueIndexes.push(index.columns);
  }
  const groupedForeignKeys = new Map();
  for (const row of foreignKeys) {
    if (!metadata[row.tableName] || !metadata[row.referencedTable]) continue;
    const key = `${row.tableName}\u001f${row.constraintName}`;
    if (!groupedForeignKeys.has(key)) groupedForeignKeys.set(key, { ...row, columns: [], referencedColumns: [] });
    groupedForeignKeys.get(key).columns.push(row.columnName);
    groupedForeignKeys.get(key).referencedColumns.push(row.referencedColumn);
  }
  for (const foreignKey of groupedForeignKeys.values()) {
    metadata[foreignKey.tableName].foreignKeys.push({
      columns: foreignKey.columns,
      referencedTable: foreignKey.referencedTable,
      referencedColumns: foreignKey.referencedColumns,
    });
  }
  return metadata;
}

function targetValue(value, column) {
  if (value === null || value === undefined) return null;
  if (["datetime", "timestamp"].includes(column.dataType)) {
    const date = normalizeUtcDate(value);
    if (!date) throw new Error("ETL encountered an invalid timestamp after validation.");
    return date;
  }
  if (column.dataType === "json" && typeof value !== "string") return JSON.stringify(value);
  return value;
}

function insertBatch(mysql, table, rows, definition) {
  if (rows.length === 0) return;
  const columns = Object.keys(definition.columns).sort((left, right) => (
    definition.columns[left].ordinalPosition - definition.columns[right].ordinalPosition
  ));
  const values = rows.map((row) => `(${columns.map((column) => mysqlLiteral(targetValue(row[column], definition.columns[column]))).join(",")})`);
  const primary = new Set(definition.primaryKey);
  const updates = columns.filter((column) => !primary.has(column)).map((column) => `${quoteIdentifier(column)}=VALUES(${quoteIdentifier(column)})`);
  const onDuplicate = updates.length > 0 ? ` ON DUPLICATE KEY UPDATE ${updates.join(",")}` : " ON DUPLICATE KEY UPDATE " + definition.primaryKey.map((column) => `${quoteIdentifier(column)}=${quoteIdentifier(column)}`).join(",");
  mysql.execute(`START TRANSACTION; INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(",")}) VALUES ${values.join(",")}${onDuplicate}; COMMIT;`);
}

loadLocalEnvironment();
if (process.env.NODE_ENV === "production" && !process.argv.includes("--confirm-production")) {
  throw new Error("Production ETL requires the release guard and explicit --confirm-production authorization.");
}
const sourcePath = argument("--source");
if (!sourcePath || !path.isAbsolute(sourcePath)) throw new Error("--source must be an absolute SQLite path.");
const apply = process.argv.includes("--apply");
const mysql = createMysqlCli();
const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
source.pragma("query_only = ON");
try {
  const integrity = source.pragma("integrity_check");
  if (integrity.length !== 1 || String(integrity[0]?.integrity_check).toLowerCase() !== "ok") {
    throw new Error("Source SQLite integrity validation failed.");
  }
  const metadata = loadTargetMetadata(mysql);
  const targetTables = Object.keys(metadata);
  const auditChainHeadTable = targetTables.find((table) => table.toLocaleLowerCase("en-US") === "auditchainhead");
  const auditEventTable = targetTables.find((table) => table.toLocaleLowerCase("en-US") === "auditevent");
  if (!auditChainHeadTable || !auditEventTable) throw new Error("Target MySQL audit tables are incomplete.");
  const sourceTables = buildCaseInsensitiveNameMap(
    source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name),
  );
  const rowsByTable = {};
  for (const table of targetTables) {
    if (table === auditChainHeadTable) continue;
    const sourceTable = sourceTables.get(table.toLocaleLowerCase("en-US"));
    if (!sourceTable) throw new Error(`Source SQLite is missing target table ${table}.`);
    rowsByTable[table] = source.prepare(`SELECT * FROM ${quoteIdentifier(sourceTable)}`).all();
  }
  rowsByTable[auditChainHeadTable] = deriveAuditChainHeadRows(rowsByTable[auditEventTable]);
  const issues = validateSourceRows(rowsByTable, metadata);
  if (issues.length > 0) {
    const issueCounts = Object.fromEntries([...new Set(issues.map((issue) => issue.code))].sort().map((code) => [code, issues.filter((issue) => issue.code === code).length]));
    console.log(JSON.stringify({ version: 1, validation: "failed", issueCounts }));
    throw new Error("ETL source validation failed; only aggregate issue counts were emitted.");
  }
  const order = buildLoadOrder(metadata).filter((table) => table !== auditChainHeadTable);
  order.push(auditChainHeadTable);
  if (apply) {
    const batchSize = Math.max(1, Math.min(1000, Number(process.env.ETL_BATCH_SIZE ?? 250)));
    for (const table of order) {
      for (let offset = 0; offset < rowsByTable[table].length; offset += batchSize) {
        insertBatch(mysql, table, rowsByTable[table].slice(offset, offset + batchSize), metadata[table]);
      }
    }
  }
  const reconciliation = order.map((table) => {
    const targetRows = apply ? mysql.query(`SELECT * FROM ${quoteIdentifier(table)} ORDER BY ${metadata[table].primaryKey.map(quoteIdentifier).join(",")}`) : [];
    return {
      table,
      sourceCount: rowsByTable[table].length,
      targetCount: apply ? targetRows.length : 0,
      sourceChecksum: aggregateChecksum(rowsByTable[table], metadata[table]),
      targetChecksum: apply ? aggregateChecksum(targetRows, metadata[table]) : null,
    };
  });
  console.log(formatAggregateReconciliation(reconciliation));
  if (apply && reconciliation.some((row) => row.sourceCount !== row.targetCount || row.sourceChecksum !== row.targetChecksum)) {
    throw new Error("ETL aggregate reconciliation failed.");
  }
} finally {
  source.close();
}
