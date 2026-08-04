import { describe, expect, it } from "vitest";

import {
  buildCaseInsensitiveNameMap,
  buildLoadOrder,
  deriveAuditChainHeadRows,
  formatAggregateReconciliation,
  normalizeNumericValue,
  validateSourceRows,
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

  it("canonicalizes equivalent SQLite and MySQL numeric representations", () => {
    expect(normalizeNumericValue(1_100_000)).toBe("1100000");
    expect(normalizeNumericValue("1100000.00000000")).toBe("1100000");
    expect(normalizeNumericValue("1.25e-3")).toBe("0.00125");
    expect(normalizeNumericValue("-0.0000")).toBe("0");
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
