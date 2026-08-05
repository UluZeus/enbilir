import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { describe, expect, it } from "vitest";

import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { canUseDisposableMysql, createDisposableMysqlDatabase } from "../../scripts/lib/disposable-mysql.mjs";
import { createMysqlCli, MysqlCliDatabase } from "../../scripts/lib/mysql-cli.mjs";

const readProjectFile = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("MySQL AI report string widths", () => {
  it("keeps the three migrated fields bounded at VARCHAR(512) in Prisma", () => {
    const schema = readProjectFile("prisma", "schema.prisma");

    expect(schema).toMatch(/marketRegime\s+String\?\s+@db\.VarChar\(512\)/);
    expect(schema).toMatch(/riskAppetite\s+String\?\s+@db\.VarChar\(512\)/);
    expect(schema).toMatch(/model AiMarketReportNewsItem[\s\S]*?title\s+String\s+@db\.VarChar\(512\)/);
  });

  it("widens exactly those columns through an additive MySQL migration", () => {
    const migration = readProjectFile(
      "prisma",
      "migrations-mysql",
      "20260804163000_widen_ai_report_string_fields",
      "migration.sql",
    );

    expect(migration.match(/MODIFY `/g)).toHaveLength(3);
    expect(migration).toContain("`marketRegime` VARCHAR(512) NULL");
    expect(migration).toContain("`riskAppetite` VARCHAR(512) NULL");
    expect(migration).toContain("`title` VARCHAR(512) NOT NULL");
    expect(migration).not.toContain("CREATE TABLE");
    expect(migration).not.toContain("VARCHAR(191)");
  });
});

const describeMysql = canUseDisposableMysql() ? describe : describe.skip;

describeMysql("MySQL AI report width migration", () => {
  it("deploys and redeploys idempotently against disposable MySQL", async () => {
    const disposable = createDisposableMysqlDatabase({ purpose: "test" });
    try {
      const npmCommand = process.platform === "win32" ? process.execPath : "npm";
      const npmArguments = process.platform === "win32"
        ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), "run", "db:deploy"]
        : ["run", "db:deploy"];
      const environment: NodeJS.ProcessEnv = {
        ...process.env,
        ENBILIR_ENV: "test",
        NODE_ENV: "test",
        DATABASE_URL: disposable.databaseUrl,
      };
      execFileSync(npmCommand, npmArguments, { cwd: process.cwd(), env: environment, stdio: "pipe" });
      execFileSync(npmCommand, npmArguments, { cwd: process.cwd(), env: environment, stdio: "pipe" });

      const mysql = createMysqlCli({ defaultsFile: disposable.defaultsFile, database: disposable.database });
      const columns = mysql.query(`
        SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName,
               CHARACTER_MAXIMUM_LENGTH AS maxLength
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND ((TABLE_NAME = 'AiMarketReport' AND COLUMN_NAME IN ('marketRegime', 'riskAppetite'))
            OR (TABLE_NAME = 'AiMarketReportNewsItem' AND COLUMN_NAME = 'title'))
        ORDER BY TABLE_NAME, COLUMN_NAME
      `);
      expect(columns.map((column) => ({
        tableName: String(column.tableName).toLocaleLowerCase("en-US"),
        columnName: column.columnName,
        maxLength: Number(column.maxLength),
      }))).toEqual([
        { tableName: "aimarketreport", columnName: "marketRegime", maxLength: 512 },
        { tableName: "aimarketreport", columnName: "riskAppetite", maxLength: 512 },
        { tableName: "aimarketreportnewsitem", columnName: "title", maxLength: 512 },
      ]);
      expect(mysql.query(`
        SELECT migration_name AS migrationName, COUNT(*) AS appliedCount
        FROM _prisma_migrations
        WHERE finished_at IS NOT NULL
          AND rolled_back_at IS NULL
          AND migration_name IN (
            '20260804163000_widen_ai_report_string_fields',
            '20260804180000_add_ai_report_audience_idempotency'
          )
        GROUP BY migration_name
        ORDER BY migration_name
      `).map((row) => ({
        migrationName: row.migrationName,
        appliedCount: Number(row.appliedCount),
      }))).toEqual([
        { migrationName: "20260804163000_widen_ai_report_string_fields", appliedCount: 1 },
        { migrationName: "20260804180000_add_ai_report_audience_idempotency", appliedCount: 1 },
      ]);

      const database = new MysqlCliDatabase({ defaultsFile: disposable.defaultsFile, database: disposable.database });
      const timestamp = new Date("2026-08-04T12:00:00.000Z");
      database.prepare(`
        INSERT INTO \`AiMarketReport\` (
          id, audienceKey, periodKey, scope, status, macroSummary, keyTakeaways,
          requiredCoverage, fallbackUsed, disclaimer, generatedAt, createdAt, updatedAt
        ) VALUES (?, 'PUBLIC', '2026-08-04T12:00Z', 'GLOBAL', 'COMPLETED', 'summary', '[]', '[]', 0, 'test', ?, ?, ?)
      `).run("report-width-boundary", timestamp, timestamp, timestamp);

      const insertNews = database.prepare(`
        INSERT INTO \`AiMarketReportNewsItem\` (
          id, reportId, title, link, source, createdAt
        ) VALUES (?, 'report-width-boundary', ?, 'https://example.invalid/story', ?, ?)
      `);
      expect(insertNews.run("news-at-boundary", "😀".repeat(512), "Ş".repeat(191), timestamp).changes).toBe(1);
      expect(() => insertNews.run("news-title-over-boundary", `${"😀".repeat(512)}X`, "source", timestamp)).toThrow();
      expect(() => insertNews.run("news-source-over-boundary", "title", `${"Ş".repeat(191)}X`, timestamp)).toThrow();

      const insertReport = database.prepare(`
        INSERT INTO \`AiMarketReport\` (
          id, audienceKey, periodKey, scope, status, macroSummary, keyTakeaways,
          requiredCoverage, fallbackUsed, disclaimer, generatedAt, createdAt, updatedAt
        ) VALUES (?, ?, '2026-08-04T13:00Z', ?, 'COMPLETED', 'summary', '[]', '[]', 0, 'test', ?, ?, ?)
      `);
      expect(insertReport.run("global-idempotency-1", "PUBLIC", "GLOBAL", timestamp, timestamp, timestamp).changes).toBe(1);
      expect(() => insertReport.run("global-idempotency-2", "PUBLIC", "GLOBAL", timestamp, timestamp, timestamp)).toThrow();
      expect(insertReport.run("user-idempotency-1", "user-1", "USER", timestamp, timestamp, timestamp).changes).toBe(1);
      expect(insertReport.run("user-idempotency-2", "user-2", "USER", timestamp, timestamp, timestamp).changes).toBe(1);

      const prisma = new PrismaClient({ adapter: new PrismaMariaDb(disposable.databaseUrl) });
      try {
        const reportData = {
          audienceKey: "PUBLIC",
          periodKey: "2026-08-04T14:00Z",
          scope: "GLOBAL",
          macroSummary: "summary",
          keyTakeaways: [],
          requiredCoverage: [],
          disclaimer: "test",
        };
        await prisma.aiMarketReport.create({ data: { id: "prisma-idempotency-1", ...reportData } });
        let conflict: unknown;
        try {
          await prisma.aiMarketReport.create({ data: { id: "prisma-idempotency-2", ...reportData } });
        } catch (error) {
          conflict = error;
        }

        expect(conflict).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(conflict).toMatchObject({ code: "P2002" });
        expect((conflict as Prisma.PrismaClientKnownRequestError).meta).toMatchObject({
          modelName: "AiMarketReport",
          driverAdapterError: {
            cause: {
              constraint: { index: "AiMarketReport_audienceKey_periodKey_scope_key" },
            },
          },
        });
      } finally {
        await prisma.$disconnect();
      }
    } finally {
      disposable.drop();
    }
  }, 60_000);
});
