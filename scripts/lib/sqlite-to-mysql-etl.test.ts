import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";

import { canUseDisposableMysql, createDisposableMysqlDatabase } from "./disposable-mysql.mjs";
import { buildMysqlArguments, createMysqlCli, mysqlLiteral, parseMysqlBatch } from "./mysql-cli.mjs";

import {
  aggregateChecksum,
  aggregateChecksumFromRows,
  batchRows,
  buildMysqlHexSelectExpression,
  buildCaseInsensitiveNameMap,
  buildLoadOrder,
  canonicalizeJsonForMysql,
  categorizeJsonColumnDifferences,
  createAggregateChecksum,
  deriveAuditChainHeadRows,
  decodeMysqlTransportRow,
  deriveAiReportAudienceKey,
  formatAggregateReconciliation,
  formatEtlProgress,
  formatStagingMismatchDiagnostics,
  formatValidationFailure,
  iterateAiReportSourceRows,
  mysqlCanonicalJsonExpression,
  mysqlLosslessJsonExpression,
  normalizeRow,
  prepareLosslessJsonForMysql,
  normalizeDecimalValue,
  normalizeNumericValue,
  requiresMysqlHexTransport,
  splitMysqlInsertStatements,
  summarizeRowsWithColumns,
  validateSourceRows,
  validateSourceStreams,
  validatePaymentVipDomain,
} from "./sqlite-to-mysql-etl.mjs";

const metadata = {
  Parent: {
    columns: {
      id: { dataType: "varchar", nullable: false, maxLength: 32 },
      kind: { dataType: "enum", nullable: false, enumValues: ["A", "B"] },
      payload: { dataType: "json", nullable: true, maxLength: null },
      createdAt: { dataType: "datetime", nullable: false, maxLength: null },
    },
    primaryKey: ["id"],
    uniqueIndexes: [["id"]],
    foreignKeys: [],
  },
  Child: {
    columns: {
      id: { dataType: "varchar", nullable: false, maxLength: 32 },
      parentId: { dataType: "varchar", nullable: false, maxLength: 32 },
    },
    primaryKey: ["id"],
    uniqueIndexes: [["id"]],
    foreignKeys: [{ columns: ["parentId"], referencedTable: "Parent", referencedColumns: ["id"] }],
  },
} as const;

describe("SQLite to MySQL ETL validation", () => {
  it("derives migration-compatible AI report audience keys for public, user, and legacy duplicates", () => {
    expect(deriveAiReportAudienceKey({
      id: "canonical-global",
      userId: null,
      periodKey: "2026-W31",
      scope: "GLOBAL",
    }, true)).toBe("PUBLIC");
    expect(deriveAiReportAudienceKey({
      id: "canonical-weekly",
      userId: null,
      periodKey: "2026-W31",
      scope: "WEEKLY",
    }, true)).toBe("PUBLIC");
    expect(deriveAiReportAudienceKey({
      id: "user-report",
      userId: "user-42",
      periodKey: "2026-W31",
      scope: "USER",
    }, false)).toBe("user-42");
    expect(deriveAiReportAudienceKey({
      id: "abc",
      userId: null,
      periodKey: "2026-W31",
      scope: "GLOBAL",
    }, false)).toBe("LEGACY:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(deriveAiReportAudienceKey({
      id: "abc",
      userId: null,
      periodKey: "2026-W31",
      scope: "MONTHLY",
    }, true)).toBe("LEGACY:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("streams duplicate legacy AI reports and marks only the migration-compatible minimum id public", () => {
    const source = new Database(":memory:");
    try {
      source.exec(`
        CREATE TABLE AiMarketReport (
          id TEXT NOT NULL PRIMARY KEY,
          userId TEXT NULL,
          periodKey TEXT NOT NULL,
          scope TEXT NOT NULL
        );
        INSERT INTO AiMarketReport (id, userId, periodKey, scope) VALUES
          ('report-b', NULL, '2026-W31', 'GLOBAL'),
          ('report-a', NULL, '2026-W31', 'GLOBAL'),
          ('report-c', NULL, '2026-W31', 'WEEKLY'),
          ('report-d', 'user-42', '2026-W31', 'USER'),
          ('report-e', NULL, '2026-W31', 'MONTHLY');
      `);

      const rows = iterateAiReportSourceRows(source, "AiMarketReport");
      expect(rows).not.toHaveProperty("length");
      const byId = new Map([...rows].map((row) => [row.id, row]));
      expect(byId.get("report-a")?.audienceKey).toBe("PUBLIC");
      expect(byId.get("report-b")?.audienceKey).toMatch(/^LEGACY:[a-f0-9]{64}$/);
      expect(byId.get("report-c")?.audienceKey).toBe("PUBLIC");
      expect(byId.get("report-d")?.audienceKey).toBe("user-42");
      expect(byId.get("report-e")?.audienceKey).toMatch(/^LEGACY:[a-f0-9]{64}$/);
    } finally {
      source.close();
    }
  });

  it("passes payment/VIP validation when payment and claim tables are empty", () => {
    const rows = {
      User: [{ id: "legacy-user", membershipTier: "VIP", vipPaidUntil: "2027-01-01T00:00:00.000Z" }],
      VipSubscriptionPayment: [],
      VipSubscriptionClaim: [],
    };

    expect(validatePaymentVipDomain({
      metadata: Object.fromEntries(Object.keys(rows).map((table) => [table, {}])),
      rowsForTable: (table: keyof typeof rows) => rows[table],
      now: new Date("2026-08-04T12:00:00.000Z"),
    })).toEqual({ issueCounts: {}, issueLocations: [] });
  });

  it("accepts allowed payment statuses and a correctly bound active VIP ledger", () => {
    const rows = {
      User: [{ id: "user-1", membershipTier: "VIP", vipPaidUntil: "2026-09-04T12:00:00.000Z" }],
      VipSubscriptionPayment: [
        { userId: "user-1", provider: "PARAM", providerReference: "PARAM:REF-1", amountTry: "100.00000000", currency: "TRY", status: "PAID", paidAt: "2026-08-04T12:00:00.000Z", paidUntil: "2026-09-04T12:00:00.000Z", revokedAt: null },
        { userId: "user-1", provider: "PARAM", providerReference: "PARAM:REF-2", amountTry: 100, currency: "TRY", status: "REFUNDED", paidAt: "2026-06-01T00:00:00.000Z", paidUntil: "2026-07-01T00:00:00.000Z", revokedAt: "2026-06-02T00:00:00.000Z" },
        { userId: "user-1", provider: "PARAM", providerReference: "PARAM:REF-3", amountTry: 100, currency: "TRY", status: "CHARGEBACK", paidAt: "2026-05-01T00:00:00.000Z", paidUntil: "2026-06-01T00:00:00.000Z", revokedAt: "2026-05-02T00:00:00.000Z" },
        { userId: "user-1", provider: "PARAM", providerReference: "PARAM:REF-4", amountTry: 100, currency: "TRY", status: "REVOKED", paidAt: "2026-04-01T00:00:00.000Z", paidUntil: "2026-05-01T00:00:00.000Z", revokedAt: "2026-04-02T00:00:00.000Z" },
      ],
      VipSubscriptionClaim: [
        { userId: "user-1", provider: "PARAM", providerReference: "REF-1", status: "APPROVED" },
      ],
    };

    expect(validatePaymentVipDomain({
      metadata: Object.fromEntries(Object.keys(rows).map((table) => [table, {}])),
      rowsForTable: (table: keyof typeof rows) => rows[table],
      now: new Date("2026-08-04T12:00:00.000Z"),
    })).toEqual({ issueCounts: {}, issueLocations: [] });
  });

  it("reports aggregate-only payment, claim-binding, and VIP ledger violations", () => {
    const rows = {
      User: [
        { id: "user-1", membershipTier: "STANDARD", vipPaidUntil: null },
        { id: "user-2", membershipTier: "STANDARD", vipPaidUntil: null },
      ],
      VipSubscriptionPayment: [
        { userId: "user-1", provider: "PARAM", providerReference: "PARAM:REF-1", amountTry: 100, currency: "TRY", status: "PAID", paidAt: "2026-08-04T12:00:00.000Z", paidUntil: "2026-09-04T12:00:00.000Z", revokedAt: null },
        { userId: "user-2", provider: "param", providerReference: "ref-1", amountTry: 99, currency: "USD", status: "UNKNOWN", paidAt: "2026-08-05T00:00:00.000Z", paidUntil: "2026-08-04T00:00:00.000Z", revokedAt: null },
        { userId: "user-2", provider: "PARAM", providerReference: "PARAM:REF-3", amountTry: 100, currency: "TRY", status: "PAID", paidAt: "2026-09-01T00:00:00.000Z", paidUntil: "2026-08-01T00:00:00.000Z", revokedAt: null },
      ],
      VipSubscriptionClaim: [
        { userId: "user-2", provider: "PARAM", providerReference: "REF-1", status: "APPROVED" },
      ],
    };
    const validation = validatePaymentVipDomain({
      metadata: Object.fromEntries(Object.keys(rows).map((table) => [table, {}])),
      rowsForTable: (table: keyof typeof rows) => rows[table],
      now: new Date("2026-08-04T12:00:00.000Z"),
    });

    expect(validation.issueCounts).toEqual(expect.objectContaining({
      INVALID_PAYMENT_STATUS: 1,
      INVALID_PAYMENT_AMOUNT: 1,
      INVALID_PAYMENT_CURRENCY: 1,
      INVALID_PAYMENT_GRANT_WINDOW: 2,
      CANONICAL_PAYMENT_REFERENCE_COLLISION: 1,
      APPROVED_CLAIM_PAYMENT_MISMATCH: 1,
      VIP_LEDGER_STATE_MISMATCH: 1,
    }));
    const serialized = JSON.stringify(validation);
    expect(serialized).not.toContain("REF-1");
    expect(serialized).not.toContain("user-1");
    expect(serialized).not.toContain("user-2");
  });



  it("round-trips large MySQL text and JSON through HEX transport without delimiter corruption", () => {
    const largeText = `${"segment\twith\nslashes\\and-unicode-İstanbul-😀".repeat(600)}`;
    const payload = JSON.stringify({ largeText, nested: ["tab\t", "line\n", "slash\\", "東京"] });
    expect(payload.length).toBeGreaterThan(16 * 1024);
    const definition = {
      columns: {
        id: { dataType: "varchar" },
        payload: { dataType: "json" },
        binaryValue: { dataType: "longblob" },
        amount: { dataType: "decimal" },
      },
    };

    expect(requiresMysqlHexTransport(definition.columns.id)).toBe(true);
    expect(requiresMysqlHexTransport(definition.columns.payload)).toBe(true);
    expect(requiresMysqlHexTransport(definition.columns.binaryValue)).toBe(true);
    expect(requiresMysqlHexTransport(definition.columns.amount)).toBe(false);
    const decoded = decodeMysqlTransportRow({
      id: `0x${Buffer.from(`H${Buffer.from("row\t1", "utf8").toString("hex")}`, "ascii").toString("hex")}`,
      payload: `H${Buffer.from(payload, "utf8").toString("hex")}`,
      binaryValue: `H${Buffer.from([0, 9, 10, 92, 255]).toString("hex")}`,
      amount: "12.50",
    }, definition);

    expect(decoded).toEqual({
      id: "row\t1",
      payload,
      binaryValue: Buffer.from([0, 9, 10, 92, 255]),
      amount: "12.50",
    });
  });

  it("casts native MySQL JSON to text before framing it for delimiter-safe transport", () => {
    expect(buildMysqlHexSelectExpression("payload", { dataType: "json" })).toBe(
      "CONCAT('H', CAST(HEX(CAST(`payload` AS CHAR CHARACTER SET utf8mb4)) AS CHAR CHARACTER SET ascii)) AS `payload`",
    );
    expect(buildMysqlHexSelectExpression("amount", { dataType: "decimal" })).toBe("`amount`");
  });

  it("reports invalid staged JSON with privacy-safe table, column, and category context", () => {
    const nativeBinaryJsonReadback = Buffer.concat([
      Buffer.from([0x00, 0x01, 0x00, 0x10, 0x00]),
      Buffer.from("must-never-leak", "utf8"),
    ]);
    const decoded = decodeMysqlTransportRow(
      { sourcePayload: `H${nativeBinaryJsonReadback.toString("hex")}` },
      { columns: { sourcePayload: { dataType: "json" } } },
      { table: "AiMarketReportAsset" },
    );
    let message = "";
    try {
      normalizeRow(
        decoded,
        { columns: { sourcePayload: { dataType: "json" } } },
        { table: "AiMarketReportAsset" },
      );
    } catch (error) {
      message = String(error);
    }

    expect(message).toContain("table=AiMarketReportAsset");
    expect(message).toContain("column=sourcePayload");
    expect(message).toContain("category=invalid-json");
    expect(message).not.toContain("must-never-leak");
  });

  it("formats ETL progress without row values or identifiers", () => {
    const output = formatEtlProgress({ table: "AiMarketReportAsset", category: "staging-reconciliation-start", count: 42 });

    expect(JSON.parse(output)).toEqual({
      version: 1,
      etlProgress: { table: "AiMarketReportAsset", category: "staging-reconciliation-start", count: 42 },
    });
    expect(output).not.toContain("private-row-id");
  });

  it("redacts invalid JSON normalization errors without retaining raw content", () => {
    const privateJson = '{"private":"must-never-leak" trailing-content';
    const definition = { columns: { payload: { dataType: "json" } } };

    expect(() => aggregateChecksum([{ payload: privateJson }], definition))
      .toThrow("ETL encountered invalid JSON during checksum normalization.");
    try {
      aggregateChecksum([{ payload: privateJson }], definition);
    } catch (error) {
      expect(String(error)).not.toContain("must-never-leak");
      expect(String(error)).not.toContain("trailing-content");
    }
  });

  it("adds only table, column, and data type context to invalid HEX transport errors", () => {
    const invalidTransportValue = "0xGG-private-value";
    let message = "";
    try {
      decodeMysqlTransportRow(
        { payload: invalidTransportValue },
        { columns: { payload: { dataType: "json" } } },
        { table: "TransportFixture" },
      );
    } catch (error) {
      message = String(error);
    }

    expect(message).toContain("table=TransportFixture");
    expect(message).toContain("column=payload");
    expect(message).toContain("dataType=json");
    expect(message).not.toContain(invalidTransportValue);
    expect(message).not.toContain("private-value");
  });

  it("pulls source rows lazily and never builds a batch above the configured bound", () => {
    let produced = 0;
    function* sourceRows() {
      for (let id = 1; id <= 5; id += 1) {
        produced += 1;
        yield { id };
      }
    }

    const batches = batchRows(sourceRows(), 2);
    expect(produced).toBe(0);
    expect(batches.next().value).toEqual([{ id: 1 }, { id: 2 }]);
    expect(produced).toBe(2);
    expect(batches.next().value).toEqual([{ id: 3 }, { id: 4 }]);
    expect(produced).toBe(4);
    expect(batches.next().value).toEqual([{ id: 5 }]);
    expect(produced).toBe(5);
    expect(batches.next().done).toBe(true);
  });

  it("produces the same aggregate checksum incrementally regardless of row order", () => {
    const definition = {
      columns: {
        id: { dataType: "varchar" },
        amount: { dataType: "decimal" },
        payload: { dataType: "json" },
      },
      primaryKey: ["id"],
    };
    const rows = [
      { id: "b", amount: "1100000.00000000", payload: '{"z":1,"a":2}' },
      { id: "a", amount: 1.25e-3, payload: { nested: true } },
    ];

    expect(aggregateChecksumFromRows((function* () {
      yield rows[1];
      yield rows[0];
    })(), definition)).toBe(aggregateChecksum(rows, definition));
  });

  it("loads parents before children", () => {
    expect(buildLoadOrder(metadata)).toEqual(["Parent", "Child"]);
  });

  it("maps Prisma SQLite table casing to lower-case MySQL metadata without ambiguity", () => {
    const names = buildCaseInsensitiveNameMap(["AchievementEvent", "AuditEvent"]);

    expect(names.get("achievementevent")).toBe("AchievementEvent");
    expect(names.get("auditevent")).toBe("AuditEvent");
    expect(() => buildCaseInsensitiveNameMap(["AuditEvent", "auditevent"]))
      .toThrow(/collide/i);
  });

  it("rejects malformed JSON, enums, lengths, case-fold collisions, and missing parents", () => {
    const rows = {
      Parent: [
        { id: "Same", kind: "A", payload: "{}", createdAt: 1_786_000_089_123 },
        { id: "same", kind: "INVALID", payload: "{", createdAt: 1_786_000_089_124 },
        { id: "x".repeat(33), kind: "B", payload: "[]", createdAt: 1_786_000_089_125 },
      ],
      Child: [{ id: "child", parentId: "missing" }],
    };

    const issues = validateSourceRows(rows, metadata);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["CASEFOLD_COLLISION", "INVALID_ENUM", "INVALID_JSON", "LENGTH_EXCEEDED", "MISSING_FOREIGN_KEY"]),
    );
  });

  it("emits aggregate-only reconciliation", () => {
    const output = formatAggregateReconciliation([
      { table: "Parent", sourceCount: 2, targetCount: 2, sourceChecksum: "a".repeat(64), targetChecksum: "a".repeat(64) },
    ]);

    expect(output).toContain('"sourceCount":2');
    expect(output).not.toContain("Same");
  });

  it("emits aggregate-only staging mismatch diagnostics by column", () => {
    const definition = {
      columns: {
        id: { dataType: "varchar" },
        rawAiPayload: { dataType: "json" },
      },
    };
    const source = summarizeRowsWithColumns([
      { id: "private-report-id", rawAiPayload: '{"private":"source-secret"}' },
    ], definition);
    const staged = summarizeRowsWithColumns([
      { id: "private-report-id", rawAiPayload: '{"private":"staged-secret"}' },
    ], definition);
    const output = formatStagingMismatchDiagnostics([{ table: "AiMarketReport", source, staged }]);

    expect(JSON.parse(output)).toEqual({
      version: 1,
      stagingReconciliation: "failed",
      tables: [{
        table: "AiMarketReport",
        sourceCount: 1,
        stagedCount: 1,
        countMatch: true,
        checksumMatch: false,
        jsonDifferenceCategories: [],
        mismatchedColumns: [{
          column: "rawAiPayload",
          sourceCount: 1,
          stagedCount: 1,
          countMatch: true,
          checksumMatch: false,
        }],
      }],
    });
    expect(output).not.toContain("private-report-id");
    expect(output).not.toContain("source-secret");
    expect(output).not.toContain("staged-secret");
    expect(output).not.toMatch(/[a-f0-9]{64}/i);
  });

  it("classifies JSON semantic differences without paths, keys, or values", () => {
    const categories = categorizeJsonColumnDifferences({
      sourceRows: [{
        id: "private-id",
        payload: JSON.stringify({
          privateSourceKey: "private-source-value",
          number: 1,
          typed: "1",
          resized: [1, 2],
          reordered: [1, 2],
        }),
      }],
      stagedRows: [{
        id: "private-id",
        payload: JSON.stringify({
          privateStagedKey: "private-staged-value",
          number: 2,
          typed: 1,
          resized: [1],
          reordered: [2, 1],
        }),
      }],
      definition: { columns: { id: { dataType: "varchar" }, payload: { dataType: "json" } }, primaryKey: ["id"] },
    });

    expect(categories).toEqual([
      { column: "payload", category: "array-length", count: 1 },
      { column: "payload", category: "array-order", count: 1 },
      { column: "payload", category: "numeric", count: 1 },
      { column: "payload", category: "object-key-set", count: 1 },
      { column: "payload", category: "value-type", count: 1 },
    ]);
    const serialized = JSON.stringify(categories);
    expect(serialized).not.toContain("private-id");
    expect(serialized).not.toContain("privateSourceKey");
    expect(serialized).not.toContain("privateStagedKey");
    expect(serialized).not.toContain("private-source-value");
    expect(serialized).not.toContain("private-staged-value");
  });

  it("rejects JSON numbers that cannot be represented losslessly", () => {
    expect(() => mysqlLosslessJsonExpression('{"value":9007199254740993}'))
      .toThrow("ETL cannot losslessly represent a JSON number in MySQL.");
    expect(() => mysqlLosslessJsonExpression('{"value":2.220446049250313e-31}'))
      .toThrow("ETL cannot losslessly represent a JSON number in MySQL DECIMAL.");
  });

  it("parses large JSON once and reuses its normalized form for checksum and MySQL rendering", () => {
    const payload = JSON.stringify({
      text: "large-json-segment".repeat(2_000),
      nested: { values: [0.30000000000000004, 123.45678901234567, -1.2345678901234567] },
    });
    const definition = { columns: { payload: { dataType: "json" } } };
    const expected = aggregateChecksum([{ payload }], definition);
    const parse = vi.spyOn(JSON, "parse");
    try {
      const prepared = prepareLosslessJsonForMysql(payload);
      const checksum = createAggregateChecksum(definition);
      checksum.updateNormalized({ payload: prepared.normalizedValue });

      expect(prepared.expression).toContain("JSON_SET(");
      expect(checksum.digest()).toBe(expected);
      expect(parse).toHaveBeenCalledTimes(1);
    } finally {
      parse.mockRestore();
    }
  });

  it("splits rendered MySQL insert values by exact statement bytes and redacts oversized rows", () => {
    const prefix = "INSERT INTO `Fixture` (`payload`) VALUES ";
    const suffix = " ON DUPLICATE KEY UPDATE `payload`=VALUES(`payload`)";
    const statements = splitMysqlInsertStatements({
      table: "Fixture",
      prefix,
      valueTuples: [`('${"a".repeat(30)}')`, `('${"b".repeat(30)}')`, `('${"c".repeat(30)}')`],
      suffix,
      maxBytes: 210,
    });

    expect(statements.length).toBeGreaterThan(1);
    expect(statements.every((statement) => Buffer.byteLength(`SET time_zone = '+00:00';\n${statement}\n`) <= 210)).toBe(true);

    const privateValue = `('${"must-never-leak".repeat(20)}')`;
    expect(() => splitMysqlInsertStatements({
      table: "PrivateFixture",
      prefix,
      valueTuples: [privateValue],
      suffix,
      maxBytes: 150,
    })).toThrow("ETL insert row exceeds statement byte budget (table=PrivateFixture, code=INSERT_ROW_TOO_LARGE).");
    try {
      splitMysqlInsertStatements({ table: "PrivateFixture", prefix, valueTuples: [privateValue], suffix, maxBytes: 150 });
    } catch (error) {
      expect(String(error)).not.toContain("must-never-leak");
    }
  });

  it("canonicalizes equivalent SQLite and MySQL numeric representations", () => {
    expect(normalizeNumericValue(1_100_000)).toBe("1100000");
    expect(normalizeNumericValue("1100000.00000000")).toBe("1100000");
    expect(normalizeNumericValue("1.25e-3")).toBe("0.00125");
    expect(normalizeNumericValue("-0.0000")).toBe("0");
  });

  it("deterministically rounds and bounds values for the target DECIMAL precision and scale", () => {
    expect(normalizeDecimalValue("1.005", 5, 2)).toBe("1.01");
    expect(normalizeDecimalValue("-1.005", 5, 2)).toBe("-1.01");
    expect(normalizeDecimalValue("12", 5, 2)).toBe("12.00");
    expect(normalizeDecimalValue("999.995", 5, 2)).toBeNull();
    expect(normalizeDecimalValue("not-a-number", 5, 2)).toBeNull();
  });

  it("rejects an out-of-range DECIMAL during streaming validation before loading", () => {
    const decimalMetadata = {
      Balance: {
        columns: {
          id: { dataType: "varchar", nullable: false, maxLength: 32 },
          amount: { dataType: "decimal", nullable: false, numericPrecision: 5, numericScale: 2 },
        },
        primaryKey: ["id"],
        uniqueIndexes: [["id"]],
        foreignKeys: [],
      },
    };
    const validation = validateSourceStreams({
      metadata: decimalMetadata,
      rowsForTable: () => [{ id: "synthetic", amount: "999.995" }],
    });

    expect(validation.issueCounts).toEqual({ DECIMAL_OUT_OF_RANGE: 1 });
    expect(validation.issueLocations).toEqual([
      { code: "DECIMAL_OUT_OF_RANGE", table: "Balance", column: "amount", count: 1 },
    ]);
  });

  it("validates foreign keys with one source stream per table", () => {
    const rows = {
      Parent: [{ id: "parent-1" }],
      Child: [{ id: "child-1", parentId: "parent-1" }],
    };
    const calls = { Parent: 0, Child: 0 };
    const validation = validateSourceStreams({
      metadata: {
        Parent: {
          columns: { id: { dataType: "varchar", nullable: false } },
          primaryKey: ["id"],
          uniqueIndexes: [["id"]],
          foreignKeys: [],
        },
        Child: {
          columns: {
            id: { dataType: "varchar", nullable: false },
            parentId: { dataType: "varchar", nullable: false },
          },
          primaryKey: ["id"],
          uniqueIndexes: [["id"]],
          foreignKeys: [{ columns: ["parentId"], referencedTable: "Parent", referencedColumns: ["id"] }],
        },
      },
      rowsForTable(table: keyof typeof rows) {
        calls[table] += 1;
        return rows[table];
      },
    });

    expect(validation.issueCounts).toEqual({});
    expect(calls).toEqual({ Parent: 1, Child: 1 });
  });

  it("formats aggregate validation locations without exposing values or row identifiers", () => {
    const output = formatValidationFailure({
      issueCounts: { LENGTH_EXCEEDED: 2 },
      issueLocations: [
        { code: "LENGTH_EXCEEDED", table: "Profile", column: "displayName", count: 2 },
      ],
    });

    expect(JSON.parse(output)).toEqual({
      version: 1,
      validation: "failed",
      issueCounts: { LENGTH_EXCEEDED: 2 },
      issueLocations: [
        { code: "LENGTH_EXCEEDED", table: "Profile", column: "displayName", count: 2 },
      ],
    });
    expect(output).not.toContain("private-value");
    expect(output).not.toContain("rowIndex");
    expect(output).not.toContain("entityId");
  });

  it("derives the MySQL-only audit chain head from the final legacy event", () => {
    const rows = deriveAuditChainHeadRows([
      { id: "b", eventHash: "second", createdAt: 1_786_000_089_124 },
      { id: "a", eventHash: "first", createdAt: 1_786_000_089_123 },
    ]);

    expect(rows).toEqual([expect.objectContaining({
      id: "global",
      lastEventHash: "second",
      version: 2,
      lastCreatedAt: new Date(1_786_000_089_124),
    })]);
  });

  it("rejects a broken legacy audit hash chain without exposing event content", () => {
    const auditMetadata = {
      AuditEvent: {
        columns: {
          id: { dataType: "varchar", nullable: false, maxLength: 32 },
          category: { dataType: "varchar", nullable: false, maxLength: 32 },
          entityType: { dataType: "varchar", nullable: false, maxLength: 32 },
          entityId: { dataType: "varchar", nullable: false, maxLength: 32 },
          action: { dataType: "varchar", nullable: false, maxLength: 32 },
          actorUserId: { dataType: "varchar", nullable: true, maxLength: 32 },
          payload: { dataType: "json", nullable: true, maxLength: null },
          previousHash: { dataType: "varchar", nullable: true, maxLength: 128 },
          eventHash: { dataType: "varchar", nullable: false, maxLength: 128 },
          createdAt: { dataType: "datetime", nullable: false, maxLength: null, dateTimePrecision: 3 },
        },
        primaryKey: ["id"],
        uniqueIndexes: [["id"], ["eventHash"]],
        foreignKeys: [],
      },
    };
    const issues = validateSourceRows({
      AuditEvent: [{
        id: "event-1",
        category: "security",
        entityType: "account",
        entityId: "private-id",
        action: "changed",
        actorUserId: null,
        payload: "{}",
        previousHash: null,
        eventHash: "not-a-valid-hash",
        createdAt: 1_786_000_089_123,
      }],
    }, auditMetadata);

    expect(issues.map((issue) => issue.code)).toContain("INVALID_AUDIT_CHAIN");
    expect(JSON.stringify(issues)).not.toContain("private-id");
  });
});

const describeMysql = canUseDisposableMysql() ? describe : describe.skip;

describeMysql("MySQL CLI HEX transport", () => {
  it("canonicalizes duplicate JSON keys before MySQL storage to preserve source semantics", () => {
    const disposable = createDisposableMysqlDatabase({ purpose: "test" });
    try {
      const mysql = createMysqlCli({ defaultsFile: disposable.defaultsFile, database: disposable.database });
      const duplicateJson = '{"signal":"first","signal":"last","escaped":"line\\npath\\\\file","nested":{"score":1,"score":2}}';
      const numericJson = JSON.stringify({ values: [
        0.30000000000000004,
        123.45678901234567,
        0.12345678901234566,
        1.2345678901234567,
        -1.2345678901234567,
        2.220446049250313e-16,
      ] });
      const exponentNumericJson = '{"value":1.2345678901234567e+2}';
      const losslessNumericJson = JSON.stringify({
        values: [0.30000000000000004, 123.45678901234567, 0.12345678901234566, 1.2345678901234567],
        nested: { 'quoted"\\key': -1.2345678901234567 },
      });
      const sourceSemantic = JSON.parse(duplicateJson);
      mysql.execute(`
        SET SESSION sql_mode = CONCAT_WS(',', @@sql_mode, 'NO_BACKSLASH_ESCAPES');
        CREATE TABLE json_canonicalization_fixture (
          id INT NOT NULL PRIMARY KEY,
          payload JSON NOT NULL
        );
        INSERT INTO json_canonicalization_fixture (id, payload) VALUES
          (1, ${mysqlLiteral(canonicalizeJsonForMysql(duplicateJson))}),
          (2, ${mysqlCanonicalJsonExpression(duplicateJson)}),
          (3, ${mysqlCanonicalJsonExpression(numericJson)}),
          (4, ${mysqlCanonicalJsonExpression(exponentNumericJson)}),
          (5, ${mysqlLosslessJsonExpression(exponentNumericJson)}),
          (6, ${mysqlLosslessJsonExpression(losslessNumericJson)});
      `);
      const rows = mysql.query(`
        SELECT id, ${buildMysqlHexSelectExpression("payload", { dataType: "json" })}
        FROM json_canonicalization_fixture
        ORDER BY id
      `).map((row) => decodeMysqlTransportRow(
        row,
        { columns: { id: { dataType: "int" }, payload: { dataType: "json" } } },
        { table: "json_canonicalization_fixture" },
      ));

      expect(JSON.parse(rows[0].payload)).not.toEqual(sourceSemantic);
      expect(JSON.parse(rows[1].payload)).toEqual(sourceSemantic);
      const numericCategories = categorizeJsonColumnDifferences({
        sourceRows: [{ id: "3", payload: numericJson }],
        stagedRows: [{ id: "3", payload: rows[2].payload }],
        definition: { columns: { id: { dataType: "int" }, payload: { dataType: "json" } }, primaryKey: ["id"] },
      });
      expect(JSON.parse(rows[3].payload)).not.toEqual(JSON.parse(exponentNumericJson));
      expect(JSON.parse(rows[4].payload)).toEqual(JSON.parse(exponentNumericJson));
      expect(JSON.parse(rows[5].payload)).toEqual(JSON.parse(losslessNumericJson));
      expect(numericCategories).toEqual([{ column: "payload", category: "numeric", count: 1 }]);
    } finally {
      disposable.drop();
    }
  }, 60_000);

  it("round-trips nullable and large delimiter-sensitive values through the actual CLI", () => {
    const disposable = createDisposableMysqlDatabase({ purpose: "test" });
    try {
      const mysql = createMysqlCli({ defaultsFile: disposable.defaultsFile, database: disposable.database });
      const longText = "tabs\tlines\nslashes\\unicode-İstanbul-東京-😀".repeat(600);
      const payload = JSON.stringify({ longText, controls: ["\t", "\n", "\\"], empty: "" });
      const blob = Buffer.from([0, 9, 10, 13, 26, 92, 127, 128, 255]);
      expect(payload.length).toBeGreaterThan(16 * 1024);
      mysql.execute(`
        CREATE TABLE transport_fixture (
          id INT NOT NULL PRIMARY KEY,
          nullable_text LONGTEXT NULL,
          empty_text LONGTEXT NOT NULL,
          enum_value ENUM('alpha', 'beta') NOT NULL,
          set_value SET('alpha', 'beta') NOT NULL,
          payload JSON NOT NULL,
          long_text LONGTEXT NOT NULL,
          blob_value LONGBLOB NOT NULL
        );
        INSERT INTO transport_fixture
          (id, nullable_text, empty_text, enum_value, set_value, payload, long_text, blob_value)
        VALUES
          (1, NULL, UNHEX(''), 'beta', 'alpha,beta',
           CONVERT(UNHEX('${Buffer.from(payload, "utf8").toString("hex")}') USING utf8mb4),
           CONVERT(UNHEX('${Buffer.from(longText, "utf8").toString("hex")}') USING utf8mb4),
           UNHEX('${blob.toString("hex")}'));
      `);
      const encoded = mysql.query(`
        SELECT id,
               ${buildMysqlHexSelectExpression("nullable_text", { dataType: "longtext" })},
               ${buildMysqlHexSelectExpression("empty_text", { dataType: "longtext" })},
               ${buildMysqlHexSelectExpression("enum_value", { dataType: "enum" })},
               ${buildMysqlHexSelectExpression("set_value", { dataType: "set" })},
               ${buildMysqlHexSelectExpression("payload", { dataType: "json" })},
               ${buildMysqlHexSelectExpression("long_text", { dataType: "longtext" })},
               ${buildMysqlHexSelectExpression("blob_value", { dataType: "longblob" })}
        FROM transport_fixture
        ORDER BY id
      `)[0];
      const definition = {
        columns: {
          id: { dataType: "int" },
          nullable_text: { dataType: "longtext" },
          empty_text: { dataType: "longtext" },
          enum_value: { dataType: "enum" },
          set_value: { dataType: "set" },
          payload: { dataType: "json" },
          long_text: { dataType: "longtext" },
          blob_value: { dataType: "longblob" },
        },
      };

      const decoded = decodeMysqlTransportRow(encoded, definition, { table: "transport_fixture" });
      expect(decoded.id).toBe("1");
      expect(decoded.nullable_text).toBeNull();
      expect(decoded.empty_text).toBe("");
      expect(decoded.enum_value).toBe("beta");
      expect(decoded.set_value).toBe("alpha,beta");
      expect(JSON.parse(decoded.payload)).toEqual(JSON.parse(payload));
      expect(decoded.long_text).toBe(longText);
      expect(decoded.blob_value).toEqual(blob);

      const binaryHexResult = spawnSync(
        process.env.MYSQL_BINARY ?? "mysql",
        [
          ...buildMysqlArguments({
            defaultsFile: disposable.defaultsFile,
            database: disposable.database,
          }),
          "--binary-as-hex",
        ],
        {
          cwd: process.cwd(),
          env: process.env,
          encoding: "utf8",
          input: `SELECT CAST(HEX(payload) AS BINARY) AS raw_payload, ${buildMysqlHexSelectExpression("payload", { dataType: "json" })} FROM transport_fixture WHERE id = 1;`,
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      expect(binaryHexResult.error).toBeUndefined();
      expect(binaryHexResult.status).toBe(0);
      const binaryHexRow = parseMysqlBatch(binaryHexResult.stdout)[0];
      expect(String(binaryHexRow.raw_payload).startsWith("0x")).toBe(true);
      const decodedBinaryModePayload = decodeMysqlTransportRow(
        { payload: binaryHexRow.payload },
        { columns: { payload: { dataType: "json" } } },
        { table: "transport_fixture" },
      ).payload;
      expect(decodedBinaryModePayload === decoded.payload).toBe(true);
    } finally {
      disposable.drop();
    }
  }, 60_000);

  it("runs the targeted staging diagnostic without retaining temporary tables", () => {
    const disposable = createDisposableMysqlDatabase({ purpose: "test" });
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "enbilir-etl-diagnostic-"));
    const sourcePath = path.join(temporaryRoot, "source.db");
    try {
      const mysql = createMysqlCli({ defaultsFile: disposable.defaultsFile, database: disposable.database });
      mysql.execute(`
        CREATE TABLE AiMarketReport (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          userId VARCHAR(191) NULL,
          audienceKey VARCHAR(191) NOT NULL,
          periodKey VARCHAR(191) NOT NULL,
          scope VARCHAR(191) NOT NULL,
          status VARCHAR(191) NOT NULL,
          model VARCHAR(191) NULL,
          generatedAt DATETIME(3) NOT NULL,
          macroSummary LONGTEXT NOT NULL,
          marketRegime VARCHAR(512) NULL,
          riskAppetite VARCHAR(512) NULL,
          keyTakeaways JSON NOT NULL,
          requiredCoverage JSON NOT NULL,
          newsSummary LONGTEXT NULL,
          dataSnapshot JSON NULL,
          rawAiPayload JSON NULL,
          fallbackUsed BOOLEAN NOT NULL,
          disclaimer TEXT NOT NULL,
          createdAt DATETIME(3) NOT NULL,
          updatedAt DATETIME(3) NOT NULL,
          UNIQUE KEY audience_period_scope (audienceKey, periodKey, scope)
        );
      `);
      const source = new Database(sourcePath);
      try {
        source.exec(`
          CREATE TABLE AiMarketReport (
            id TEXT NOT NULL PRIMARY KEY,
            userId TEXT NULL,
            periodKey TEXT NOT NULL,
            scope TEXT NOT NULL,
            status TEXT NOT NULL,
            model TEXT NULL,
            generatedAt DATETIME NOT NULL,
            macroSummary TEXT NOT NULL,
            marketRegime TEXT NULL,
            riskAppetite TEXT NULL,
            keyTakeaways JSON NOT NULL,
            requiredCoverage JSON NOT NULL,
            newsSummary TEXT NULL,
            dataSnapshot JSON NULL,
            rawAiPayload JSON NULL,
            fallbackUsed BOOLEAN NOT NULL,
            disclaimer TEXT NOT NULL,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL
          );
        `);
        const timestamp = Date.UTC(2026, 7, 4, 12, 34, 56, 789);
        const insertReport = source.prepare(`
          INSERT INTO AiMarketReport (
            id, userId, periodKey, scope, status, model, generatedAt, macroSummary,
            marketRegime, riskAppetite, keyTakeaways, requiredCoverage, newsSummary,
            dataSnapshot, rawAiPayload, fallbackUsed, disclaimer, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const largeNumericPayload = JSON.stringify({
          text: "large-numeric-json-".repeat(800),
          values: [0.30000000000000004, 123.45678901234567, 0.12345678901234566, -1.2345678901234567],
        });
        for (let index = 0; index < 4; index += 1) {
          insertReport.run(
            `synthetic-report-${index}`, null, `2026-W3${index}`, "GLOBAL", "COMPLETED", "synthetic-model", timestamp,
            "synthetic summary\twith delimiters\nand unicode İstanbul 東京 😀", "balanced", "neutral",
            '["synthetic"]', '{"assets":1}', null, '{"snapshot":true}', largeNumericPayload,
            0, "synthetic disclaimer", timestamp, timestamp,
          );
        }
      } finally {
        source.close();
      }

      const diagnostic = spawnSync(
        process.execPath,
        [
          path.join(process.cwd(), "scripts", "sqlite-to-mysql-etl.mjs"),
          "--source",
          sourcePath,
          "--diagnostic-table",
          "AiMarketReport",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            ENBILIR_ENV: "test",
            NODE_ENV: "test",
            MYSQL_ALLOW_DISPOSABLE_DATABASES: "1",
            MYSQL_DATABASE: disposable.database,
            MYSQL_DEFAULTS_FILE: disposable.defaultsFile,
            ETL_BATCH_SIZE: "10",
            ETL_MAX_INSERT_BYTES: "65536",
          },
          encoding: "utf8",
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      expect(diagnostic.error).toBeUndefined();
      expect(diagnostic.status, diagnostic.stderr).toBe(0);
      const aggregateLine = String(diagnostic.stdout).split(/\r?\n/).find((line) => line.startsWith('{"version":1,"stagingReconciliation":'));
      if (!aggregateLine) throw new Error("Targeted staging diagnostic did not emit aggregate output.");
      expect(JSON.parse(aggregateLine)).toEqual({
        version: 1,
        stagingReconciliation: "matched",
        tables: [expect.objectContaining({
          table: expect.stringMatching(/^aimarketreport$/i),
          sourceCount: 4,
          stagedCount: 4,
          countMatch: true,
          checksumMatch: true,
          jsonDifferenceCategories: [],
          mismatchedColumns: [],
        })],
      });
      expect(Number(mysql.queryScalar(`
        SELECT COUNT(*) AS tableCount
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'etl\\_stage\\_%'
      `))).toBe(0);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      disposable.drop();
    }
  }, 60_000);

  it("reports only aggregate columns when a targeted staging diagnostic mismatches", () => {
    const disposable = createDisposableMysqlDatabase({ purpose: "test" });
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "enbilir-etl-mismatch-"));
    const sourcePath = path.join(temporaryRoot, "source.db");
    try {
      const mysql = createMysqlCli({ defaultsFile: disposable.defaultsFile, database: disposable.database });
      mysql.execute("CREATE TABLE DiagnosticFixture (id VARCHAR(191) NOT NULL PRIMARY KEY, payload JSON NOT NULL);");
      const source = new Database(sourcePath);
      try {
        source.exec("CREATE TABLE DiagnosticFixture (id TEXT NOT NULL PRIMARY KEY, payload JSON NOT NULL);");
        const insert = source.prepare("INSERT INTO DiagnosticFixture (id, payload) VALUES (?, ?)");
        insert.run("Synthetic-Résumé", '{"kind":"synthetic"}');
        insert.run("synthetic-resume", '{"kind":"synthetic"}');
      } finally {
        source.close();
      }

      const diagnostic = spawnSync(
        process.execPath,
        [
          path.join(process.cwd(), "scripts", "sqlite-to-mysql-etl.mjs"),
          "--source",
          sourcePath,
          "--diagnostic-table",
          "DiagnosticFixture",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            ENBILIR_ENV: "test",
            NODE_ENV: "test",
            MYSQL_ALLOW_DISPOSABLE_DATABASES: "1",
            MYSQL_DATABASE: disposable.database,
            MYSQL_DEFAULTS_FILE: disposable.defaultsFile,
          },
          encoding: "utf8",
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      expect(diagnostic.error).toBeUndefined();
      expect(diagnostic.status, diagnostic.stderr).toBe(2);
      const aggregateLine = String(diagnostic.stdout).split(/\r?\n/).find((line) => line.startsWith('{"version":1,"stagingReconciliation":'));
      if (!aggregateLine) throw new Error("Targeted staging diagnostic did not emit aggregate output.");
      const aggregate = JSON.parse(aggregateLine);
      expect(aggregate).toEqual({
        version: 1,
        stagingReconciliation: "failed",
        tables: [{
          table: expect.stringMatching(/^diagnosticfixture$/i),
          sourceCount: 2,
          stagedCount: 1,
          countMatch: false,
          checksumMatch: false,
          jsonDifferenceCategories: [{ column: "payload", category: "row-alignment", count: 1 }],
          mismatchedColumns: expect.arrayContaining([
            expect.objectContaining({ column: "id", sourceCount: 2, stagedCount: 1, countMatch: false, checksumMatch: false }),
            expect.objectContaining({ column: "payload", sourceCount: 2, stagedCount: 1, countMatch: false, checksumMatch: false }),
          ]),
        }],
      });
      expect(diagnostic.stdout).not.toContain("Synthetic-Résumé");
      expect(diagnostic.stdout).not.toContain("synthetic-resume");
      expect(diagnostic.stdout).not.toContain('"kind":"synthetic"');
      expect(Number(mysql.queryScalar(`
        SELECT COUNT(*) AS tableCount
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'etl\\_stage\\_%'
      `))).toBe(0);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      disposable.drop();
    }
  }, 60_000);

  it.runIf(Boolean(process.env.ETL_DIAGNOSTIC_SOURCE))(
    "runs a privacy-safe table-targeted staging diagnostic against disposable MySQL",
    () => {
      const sourcePath = process.env.ETL_DIAGNOSTIC_SOURCE;
      const diagnosticTable = process.env.ETL_DIAGNOSTIC_TABLE ?? "AiMarketReport";
      if (!sourcePath || !path.isAbsolute(sourcePath)) throw new Error("ETL_DIAGNOSTIC_SOURCE must be absolute.");
      const disposable = createDisposableMysqlDatabase({ purpose: "test" });
      try {
        const migration = spawnSync(
          process.execPath,
          [path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"), "migrate", "deploy", "--config", "prisma.config.ts"],
          {
            cwd: process.cwd(),
            env: { ...process.env, DATABASE_URL: disposable.databaseUrl },
            encoding: "utf8",
            maxBuffer: 8 * 1024 * 1024,
          },
        );
        expect(migration.error).toBeUndefined();
        expect(migration.status).toBe(0);

        const diagnostic = spawnSync(
          process.execPath,
          [
            path.join(process.cwd(), "scripts", "sqlite-to-mysql-etl.mjs"),
            "--source",
            sourcePath,
            "--diagnostic-table",
            diagnosticTable,
          ],
          {
            cwd: process.cwd(),
            env: {
              ...process.env,
              ENBILIR_ENV: "test",
              NODE_ENV: "test",
              MYSQL_ALLOW_DISPOSABLE_DATABASES: "1",
              MYSQL_DATABASE: disposable.database,
              MYSQL_DEFAULTS_FILE: disposable.defaultsFile,
            },
            encoding: "utf8",
            maxBuffer: 8 * 1024 * 1024,
          },
        );
        expect(diagnostic.error).toBeUndefined();
        expect([0, 2]).toContain(diagnostic.status);
        const aggregateLine = String(diagnostic.stdout).split(/\r?\n/).find((line) => line.startsWith('{"version":1,"stagingReconciliation":'));
        if (!aggregateLine) throw new Error("Targeted staging diagnostic did not emit aggregate output.");
        const aggregate = JSON.parse(aggregateLine);
        expect(aggregate.tables).toEqual([expect.objectContaining({
          table: expect.stringMatching(new RegExp(`^${diagnosticTable}$`, "i")),
          sourceCount: expect.any(Number),
          stagedCount: expect.any(Number),
          countMatch: expect.any(Boolean),
          checksumMatch: expect.any(Boolean),
          mismatchedColumns: expect.any(Array),
        })]);
        console.log(JSON.stringify(aggregate));
      } finally {
        disposable.drop();
      }
    },
    30 * 60_000,
  );
});
