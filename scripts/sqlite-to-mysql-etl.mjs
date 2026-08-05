#!/usr/bin/env node
import path from "node:path";

import Database from "better-sqlite3";

import { createMysqlCli, mysqlLiteral } from "./lib/mysql-cli.mjs";
import {
  aggregateChecksumFromRows,
  batchRows,
  buildMysqlHexSelectExpression,
  buildCaseInsensitiveNameMap,
  buildLoadOrder,
  categorizeJsonColumnDifferences,
  createAggregateChecksum,
  decodeMysqlTransportRow,
  formatAggregateReconciliation,
  formatEtlProgress,
  formatStagingMismatchDiagnostics,
  formatValidationFailure,
  iterateAiReportSourceRows,
  normalizeDecimalValue,
  normalizeRow,
  normalizeUtcDate,
  prepareLosslessJsonForMysql,
  splitMysqlInsertStatements,
  summarizeRowsWithColumns,
  validateSourceStreams,
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
           NUMERIC_PRECISION AS numericPrecision, NUMERIC_SCALE AS numericScale,
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
      numericPrecision: row.numericPrecision === null ? null : Number(row.numericPrecision),
      numericScale: row.numericScale === null ? null : Number(row.numericScale),
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
  if (column.dataType === "decimal") {
    const decimal = normalizeDecimalValue(value, column.numericPrecision, column.numericScale);
    if (decimal === null) throw new Error("ETL encountered an invalid DECIMAL value after validation.");
    return decimal;
  }
  if (column.dataType === "json" && typeof value !== "string") return JSON.stringify(value);
  return value;
}

function targetSqlExpression(value, column) {
  return mysqlLiteral(targetValue(value, column));
}

function prepareInsertRow(row, columns, definition) {
  const preparedJsonValues = {};
  const expressions = columns.map((columnName) => {
    const column = definition.columns[columnName];
    const value = row[columnName];
    if (value !== null && value !== undefined && column.dataType === "json") {
      const prepared = prepareLosslessJsonForMysql(value);
      preparedJsonValues[columnName] = prepared.normalizedValue;
      return prepared.expression;
    }
    return targetSqlExpression(value, column);
  });
  return {
    normalizedRow: normalizeRow(row, definition, { preparedJsonValues }),
    valueTuple: `(${expressions.join(",")})`,
  };
}

function insertBatch(mysql, table, rows, definition, maxInsertBytes, logicalTable = table, sourceChecksum = undefined) {
  if (rows.length === 0) return;
  const columns = Object.keys(definition.columns).sort((left, right) => (
    definition.columns[left].ordinalPosition - definition.columns[right].ordinalPosition
  ));
  const preparedRows = rows.map((row) => prepareInsertRow(row, columns, definition));
  if (sourceChecksum) {
    for (const prepared of preparedRows) sourceChecksum.updateNormalized(prepared.normalizedRow);
  }
  const valueTuples = preparedRows.map((prepared) => prepared.valueTuple);
  const primary = new Set(definition.primaryKey);
  const updates = columns.filter((column) => !primary.has(column)).map((column) => `${quoteIdentifier(column)}=VALUES(${quoteIdentifier(column)})`);
  const onDuplicate = updates.length > 0 ? ` ON DUPLICATE KEY UPDATE ${updates.join(",")}` : " ON DUPLICATE KEY UPDATE " + definition.primaryKey.map((column) => `${quoteIdentifier(column)}=${quoteIdentifier(column)}`).join(",");
  const prefix = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(",")}) VALUES `;
  try {
    const statements = splitMysqlInsertStatements({
      table: logicalTable,
      prefix,
      valueTuples,
      suffix: onDuplicate,
      maxBytes: maxInsertBytes,
    });
    for (const statement of statements) mysql.execute(statement);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "MySQL rejected the batch.";
    throw new Error(`ETL staging insert failed (table=${logicalTable}). ${reason}`);
  }
}

function configuredBatchSize() {
  const value = Number(process.env.ETL_BATCH_SIZE ?? 250);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("ETL_BATCH_SIZE must be a positive integer.");
  return Math.min(1000, value);
}

function configuredMaxInsertBytes() {
  const hardCap = 8 * 1024 * 1024;
  const value = Number(process.env.ETL_MAX_INSERT_BYTES ?? hardCap);
  if (!Number.isSafeInteger(value) || value < 64 * 1024 || value > hardCap) {
    throw new Error("ETL_MAX_INSERT_BYTES must be an integer from 65536 through 8388608.");
  }
  return value;
}

function configuredReadBatchSize() {
  const value = Number(process.env.ETL_READ_BATCH_SIZE ?? 250);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("ETL_READ_BATCH_SIZE must be a positive integer.");
  // The largest observed legacy row remains below 100 KiB. A 250-row cap keeps
  // framed HEX output under the MySQL CLI's 64 MiB buffer while avoiding
  // thousands of process-spawn round trips on multi-gigabyte tables.
  return Math.min(250, value);
}

function sourceColumnNames(source, sourceTable) {
  return new Set(source.prepare(`PRAGMA table_info(${quoteIdentifier(sourceTable)})`).all().map((column) => column.name));
}

function targetColumns(definition) {
  return Object.keys(definition.columns).sort((left, right) => (
    definition.columns[left].ordinalPosition - definition.columns[right].ordinalPosition
  ));
}

function* iterateTargetRows(mysql, table, definition, batchSize) {
  const primaryKey = definition.primaryKey ?? [];
  if (primaryKey.length === 0) throw new Error(`Target table ${table} has no primary key for bounded reconciliation.`);
  const columns = targetColumns(definition);
  const selectColumns = columns.map((column) => buildMysqlHexSelectExpression(column, definition.columns[column]));
  let cursor = null;
  while (true) {
    const where = cursor === null ? "" : primaryKey.length === 1
      ? ` WHERE ${quoteIdentifier(primaryKey[0])} > ${mysqlLiteral(targetValue(cursor[primaryKey[0]], definition.columns[primaryKey[0]]))}`
      : ` WHERE (${primaryKey.map(quoteIdentifier).join(",")}) > (${primaryKey.map((column) => mysqlLiteral(targetValue(cursor[column], definition.columns[column]))).join(",")})`;
    const rows = mysql.query(
      `SELECT ${selectColumns.join(",")} FROM ${quoteIdentifier(table)}${where} ORDER BY ${primaryKey.map(quoteIdentifier).join(",")} LIMIT ${batchSize}`,
    ).map((row) => decodeMysqlTransportRow(row, definition, { table }));
    if (rows.length === 0) return;
    for (const row of rows) yield row;
    if (rows.length < batchSize) return;
    const nextCursor = rows.at(-1);
    if (cursor && primaryKey.every((column) => String(cursor[column]) === String(nextCursor[column]))) {
      throw new Error(`Target table ${table} pagination did not advance.`);
    }
    cursor = nextCursor;
  }
}

const PROGRESS_ROW_INTERVAL = 10_000;

function logEtlProgress(table, category, count) {
  console.log(formatEtlProgress({ table, category, count }));
}

function summarizeRows(rows, definition, { table, progressCategory = undefined } = {}) {
  let count = 0;
  let nextProgressCount = PROGRESS_ROW_INTERVAL;
  function* countedRows() {
    for (const row of rows) {
      count += 1;
      if (progressCategory && count >= nextProgressCount) {
        logEtlProgress(table, progressCategory, count);
        nextProgressCount += PROGRESS_ROW_INTERVAL;
      }
      yield row;
    }
  }
  const checksum = aggregateChecksumFromRows(countedRows(), definition, { table });
  return { count, checksum };
}

function tableSummaries(mysql, tables, metadata, batchSize) {
  const summaries = {};
  for (const table of tables) {
    logEtlProgress(table, "target-reconciliation-start", 0);
    summaries[table] = summarizeRows(
      iterateTargetRows(mysql, table, metadata[table], batchSize),
      metadata[table],
      { table, progressCategory: "target-reconciliation-progress" },
    );
    logEtlProgress(table, "target-reconciliation-complete", summaries[table].count);
  }
  return summaries;
}

function summariesMatch(left, right, tables) {
  return tables.every((table) => left[table].count === right[table].count && left[table].checksum === right[table].checksum);
}

function stagingTableName(index) {
  return `etl_stage_${process.pid}_${Date.now().toString(36)}_${index}`;
}

function insertFromStagingSql(targetTable, stagingTable, definition) {
  const columns = targetColumns(definition);
  return `INSERT INTO ${quoteIdentifier(targetTable)} (${columns.map(quoteIdentifier).join(",")}) SELECT ${columns.map(quoteIdentifier).join(",")} FROM ${quoteIdentifier(stagingTable)}`;
}

function applyFromStaging({
  mysql,
  order,
  metadata,
  batchSize,
  maxInsertBytes,
  readBatchSize,
  sourceRowsForLoad,
  sourceRowsForComparison,
}) {
  const stagingTables = new Map(order.map((table, index) => [table, stagingTableName(index)]));
  const created = [];
  const sourceSummaries = {};
  let operationFailed = false;
  try {
    for (const table of order) {
      const stagingTable = stagingTables.get(table);
      mysql.execute(`CREATE TABLE ${quoteIdentifier(stagingTable)} LIKE ${quoteIdentifier(table)};`);
      created.push(stagingTable);
    }
    for (const table of order) {
      const stagingTable = stagingTables.get(table);
      const sourceChecksum = createAggregateChecksum(metadata[table], { table });
      let sourceCount = 0;
      let nextProgressCount = PROGRESS_ROW_INTERVAL;
      logEtlProgress(table, "staging-load-start", 0);
      for (const rows of batchRows(sourceRowsForLoad(table), batchSize)) {
        insertBatch(mysql, stagingTable, rows, metadata[table], maxInsertBytes, table, sourceChecksum);
        sourceCount += rows.length;
        if (sourceCount >= nextProgressCount) {
          logEtlProgress(table, "staging-load-progress", sourceCount);
          nextProgressCount += PROGRESS_ROW_INTERVAL;
        }
      }
      logEtlProgress(table, "staging-load-complete", sourceCount);
      sourceSummaries[table] = { count: sourceCount, checksum: sourceChecksum.digest() };
      logEtlProgress(table, "staging-reconciliation-start", 0);
      const stagedSummary = summarizeRows(
        iterateTargetRows(mysql, stagingTable, metadata[table], readBatchSize),
        metadata[table],
        { table, progressCategory: "staging-reconciliation-progress" },
      );
      logEtlProgress(table, "staging-reconciliation-complete", stagedSummary.count);
      if (
        sourceSummaries[table].count !== stagedSummary.count
        || sourceSummaries[table].checksum !== stagedSummary.checksum
      ) {
        const comparisons = [{
        table,
        source: summarizeRowsWithColumns(sourceRowsForLoad(table), metadata[table], { table }),
        staged: summarizeRowsWithColumns(
          iterateTargetRows(mysql, stagingTable, metadata[table], readBatchSize),
          metadata[table],
          { table },
        ),
        jsonDifferenceCategories: categorizeJsonColumnDifferences({
          sourceRows: sourceRowsForComparison(table),
          stagedRows: iterateTargetRows(mysql, stagingTable, metadata[table], readBatchSize),
          definition: metadata[table],
        }),
        }];
        console.log(formatStagingMismatchDiagnostics(comparisons));
        throw new Error("ETL staging reconciliation failed before target tables were changed.");
      }
    }
    const inserts = order.map((table) => `${insertFromStagingSql(table, stagingTables.get(table), metadata[table])};`).join("\n");
    mysql.execute(`START TRANSACTION;\n${inserts}\nCOMMIT;`);
    return sourceSummaries;
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    if (created.length > 0) {
      try {
        mysql.execute(`DROP TABLE IF EXISTS ${created.map(quoteIdentifier).join(",")};`);
      } catch (cleanupError) {
        if (!operationFailed) throw cleanupError;
      }
    }
  }
}

function assertDisposableDiagnosticTarget(mysql) {
  if (process.env.MYSQL_ALLOW_DISPOSABLE_DATABASES !== "1" || process.env.ENBILIR_ENV !== "test") {
    throw new Error("Staging diagnostics require the disposable MySQL test harness.");
  }
  if (!/^_enbilir_(?:test|e2e|preflight)_[a-z0-9_]+$/.test(mysql.database)) {
    throw new Error("Staging diagnostics refuse a non-disposable MySQL database.");
  }
}

function diagnoseStagingTable({ mysql, table, metadata, batchSize, maxInsertBytes, readBatchSize, sourceRows }) {
  const stagingTable = stagingTableName(0);
  let created = false;
  try {
    mysql.execute(`CREATE TABLE ${quoteIdentifier(stagingTable)} LIKE ${quoteIdentifier(table)};`);
    created = true;
    const sourceChecksum = createAggregateChecksum(metadata[table], { table });
    let sourceCount = 0;
    for (const rows of batchRows(sourceRows(), batchSize)) {
      insertBatch(mysql, stagingTable, rows, metadata[table], maxInsertBytes, table, sourceChecksum);
      sourceCount += rows.length;
    }
    const source = { count: sourceCount, checksum: sourceChecksum.digest() };
    const staged = summarizeRowsWithColumns(
      iterateTargetRows(mysql, stagingTable, metadata[table], readBatchSize),
      metadata[table],
      { table },
    );
    const matched = source.count === staged.count && source.checksum === staged.checksum;
    let comparison = { table, source, staged, jsonDifferenceCategories: [] };
    if (!matched) {
      comparison = {
        table,
      source: summarizeRowsWithColumns(sourceRows(), metadata[table], { table }),
      staged: summarizeRowsWithColumns(
        iterateTargetRows(mysql, stagingTable, metadata[table], readBatchSize),
        metadata[table],
        { table },
        ),
        jsonDifferenceCategories: categorizeJsonColumnDifferences({
          sourceRows: sourceRows({ primaryKeyOrder: true }),
          stagedRows: iterateTargetRows(mysql, stagingTable, metadata[table], readBatchSize),
          definition: metadata[table],
        }),
      };
    }
    console.log(formatStagingMismatchDiagnostics([comparison]));
    return matched;
  } finally {
    if (created) mysql.execute(`DROP TABLE IF EXISTS ${quoteIdentifier(stagingTable)};`);
  }
}

loadLocalEnvironment();
if (process.env.NODE_ENV === "production" && !process.argv.includes("--confirm-production")) {
  throw new Error("Production ETL requires the release guard and explicit --confirm-production authorization.");
}
const sourcePath = argument("--source");
if (!sourcePath || !path.isAbsolute(sourcePath)) throw new Error("--source must be an absolute SQLite path.");
const apply = process.argv.includes("--apply");
const diagnosticTableArgument = argument("--diagnostic-table");
if (apply && diagnosticTableArgument) throw new Error("--apply and --diagnostic-table cannot be combined.");
const mysql = createMysqlCli();
const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
source.pragma("query_only = ON");
try {
  if (!diagnosticTableArgument) {
    const integrity = source.pragma("integrity_check");
    if (integrity.length !== 1 || String(integrity[0]?.integrity_check).toLowerCase() !== "ok") {
      throw new Error("Source SQLite integrity validation failed.");
    }
  }
  const metadata = loadTargetMetadata(mysql);
  const targetTables = Object.keys(metadata);
  const auditChainHeadTable = targetTables.find((table) => table.toLocaleLowerCase("en-US") === "auditchainhead");
  const auditEventTable = targetTables.find((table) => table.toLocaleLowerCase("en-US") === "auditevent");
  const aiMarketReportTable = targetTables.find((table) => table.toLocaleLowerCase("en-US") === "aimarketreport");
  const diagnosticTable = diagnosticTableArgument
    ? buildCaseInsensitiveNameMap(targetTables).get(diagnosticTableArgument.toLocaleLowerCase("en-US"))
    : null;
  if (diagnosticTableArgument && (!diagnosticTable || diagnosticTable === auditChainHeadTable)) {
    throw new Error("--diagnostic-table must name a source-backed target table.");
  }
  if (!diagnosticTableArgument && (!auditChainHeadTable || !auditEventTable)) {
    throw new Error("Target MySQL audit tables are incomplete.");
  }
  if (!diagnosticTableArgument && !aiMarketReportTable) throw new Error("Target MySQL AI report table is missing.");
  const sourceTables = buildCaseInsensitiveNameMap(
    source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name),
  );
  const sourceTableByTarget = new Map();
  const sourceBackedTargets = diagnosticTable ? [diagnosticTable] : targetTables;
  for (const table of sourceBackedTargets) {
    if (table === auditChainHeadTable) continue;
    const sourceTable = sourceTables.get(table.toLocaleLowerCase("en-US"));
    if (!sourceTable) throw new Error(`Source SQLite is missing target table ${table}.`);
    const sourceColumns = sourceColumnNames(source, sourceTable);
    const missingColumns = Object.keys(metadata[table].columns).filter((column) => (
      !sourceColumns.has(column) && !(table === aiMarketReportTable && column === "audienceKey")
    ));
    if (missingColumns.length > 0) throw new Error(`Source SQLite table ${table} does not match the target schema.`);
    sourceTableByTarget.set(table, sourceTable);
  }
  const sourceMetadata = Object.fromEntries(Object.entries(metadata).filter(([table]) => table !== auditChainHeadTable));
  const rowsForTable = (table, options = {}) => {
    const sourceTable = sourceTableByTarget.get(table);
    if (!sourceTable) throw new Error(`Source iterator is unavailable for table ${table}.`);
    const primaryKeyOrder = options.primaryKeyOrder ? metadata[table].primaryKey ?? [] : [];
    if (options.primaryKeyOrder && primaryKeyOrder.length === 0) {
      throw new Error(`Source table ${table} has no primary key for JSON diagnostics.`);
    }
    if (table === aiMarketReportTable) return iterateAiReportSourceRows(source, sourceTable, { orderBy: primaryKeyOrder });
    const orderBy = options.auditOrder
      ? " ORDER BY `createdAt`, `id`"
      : primaryKeyOrder.length > 0 ? ` ORDER BY ${primaryKeyOrder.map(quoteIdentifier).join(",")}` : "";
    return source.prepare(`SELECT * FROM ${quoteIdentifier(sourceTable)}${orderBy}`).iterate();
  };
  if (diagnosticTableArgument) {
    assertDisposableDiagnosticTarget(mysql);
    const matched = diagnoseStagingTable({
      mysql,
      table: diagnosticTable,
      metadata,
      batchSize: configuredBatchSize(),
      maxInsertBytes: configuredMaxInsertBytes(),
      readBatchSize: configuredReadBatchSize(),
      sourceRows: (options) => rowsForTable(diagnosticTable, options),
    });
    if (!matched) process.exitCode = 2;
  } else {
  const validation = validateSourceStreams({ metadata: sourceMetadata, rowsForTable, auditEventTable });
  const auditHeadRows = validation.auditChainHeadRows;
  const auditHeadValidation = validateSourceStreams({
    metadata: { [auditChainHeadTable]: metadata[auditChainHeadTable] },
    rowsForTable: () => auditHeadRows,
  });
  const issueCounts = { ...validation.issueCounts };
  for (const [code, count] of Object.entries(auditHeadValidation.issueCounts)) issueCounts[code] = (issueCounts[code] ?? 0) + count;
  const issueLocationsByKey = new Map();
  for (const location of [...validation.issueLocations, ...auditHeadValidation.issueLocations]) {
    const key = `${location.code}\u001f${location.table}\u001f${location.column}`;
    const aggregate = issueLocationsByKey.get(key) ?? { ...location, count: 0 };
    aggregate.count += location.count;
    issueLocationsByKey.set(key, aggregate);
  }
  if (Object.keys(issueCounts).length > 0) {
    const issueLocations = [...issueLocationsByKey.values()].sort((left, right) => (
      left.code.localeCompare(right.code) || left.table.localeCompare(right.table) || left.column.localeCompare(right.column)
    ));
    console.log(formatValidationFailure({ issueCounts, issueLocations }));
    throw new Error("ETL source validation failed; only aggregate issue counts were emitted.");
  }
  const order = buildLoadOrder(metadata).filter((table) => table !== auditChainHeadTable);
  order.push(auditChainHeadTable);
  const sourceRowsForLoad = (table) => table === auditChainHeadTable ? auditHeadRows : rowsForTable(table);
  const sourceRowsForComparison = (table) => table === auditChainHeadTable
    ? auditHeadRows
    : rowsForTable(table, { primaryKeyOrder: true });
  const batchSize = configuredBatchSize();
  const maxInsertBytes = configuredMaxInsertBytes();
  const readBatchSize = configuredReadBatchSize();
  let sourceSummaries = null;
  let targetSummaries = null;
  let targetCounts = null;
  if (apply) {
    targetCounts = {};
    for (const table of order) {
      const count = Number(mysql.queryScalar(`SELECT COUNT(*) AS rowCount FROM ${quoteIdentifier(table)}`));
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error(`ETL could not safely determine target row count (table=${table}).`);
      }
      targetCounts[table] = count;
    }
  }
  const targetIsNonEmpty = apply && Object.values(targetCounts).some((count) => count > 0);
  if (!apply || targetIsNonEmpty) {
    sourceSummaries = {};
    for (const table of order) {
      logEtlProgress(table, "source-summary-start", 0);
      sourceSummaries[table] = summarizeRows(sourceRowsForLoad(table), metadata[table], {
        table,
        progressCategory: "source-summary-progress",
      });
      logEtlProgress(table, "source-summary-complete", sourceSummaries[table].count);
    }
  }
  if (apply) {
    if (targetIsNonEmpty) {
      targetSummaries = tableSummaries(mysql, order, metadata, readBatchSize);
      if (!summariesMatch(sourceSummaries, targetSummaries, order)) {
        throw new Error("ETL target is non-empty and does not already match the source; no target rows were changed.");
      }
    } else {
      sourceSummaries = applyFromStaging({
        mysql,
        order,
        metadata,
        batchSize,
        maxInsertBytes,
        readBatchSize,
        sourceRowsForLoad,
        sourceRowsForComparison,
      });
      targetSummaries = tableSummaries(mysql, order, metadata, readBatchSize);
    }
  }
  const reconciliation = order.map((table) => {
    const sourceSummary = sourceSummaries[table];
    const targetSummary = targetSummaries?.[table] ?? null;
    return {
      table,
      sourceCount: sourceSummary.count,
      targetCount: targetSummary?.count ?? 0,
      sourceChecksum: sourceSummary.checksum,
      targetChecksum: targetSummary?.checksum ?? null,
    };
  });
  console.log(formatAggregateReconciliation(reconciliation));
  if (apply && reconciliation.some((row) => row.sourceCount !== row.targetCount || row.sourceChecksum !== row.targetChecksum)) {
    throw new Error("ETL aggregate reconciliation failed.");
  }
  }
} finally {
  source.close();
}
