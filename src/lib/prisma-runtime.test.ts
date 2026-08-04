import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readProjectFile = (...segments: string[]) =>
  readFileSync(path.join(root, ...segments), "utf8");

describe("Prisma MySQL runtime contract", () => {
  it("uses the Prisma 7 MariaDB adapter without a SQLite runtime fallback", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      dependencies: Record<string, string>;
    };
    const runtime = readProjectFile("src", "lib", "prisma.ts");

    expect(packageJson.dependencies["@prisma/client"]).toBe("7.9.1");
    expect(packageJson.dependencies.prisma).toBe("7.9.1");
    expect(packageJson.dependencies["@prisma/adapter-mariadb"]).toBe("7.9.1");
    expect(packageJson.dependencies).not.toHaveProperty("@prisma/adapter-better-sqlite3");
    expect(runtime).toContain('from "@prisma/adapter-mariadb"');
    expect(runtime).not.toContain("better-sqlite3");
    expect(runtime).not.toContain("file:./dev.db");
  });

  it("keeps SQLite history as read-only ETL input while deploying a separate MySQL history", () => {
    const config = readProjectFile("prisma.config.ts");
    const sqliteSchema = readProjectFile("prisma", "schema.sqlite.prisma");
    const sqliteLock = readProjectFile("prisma", "migrations", "migration_lock.toml");
    const sqliteMigrations = readdirSync(path.join(root, "prisma", "migrations"));
    const mysqlBaseline = path.join(
      root,
      "prisma",
      "migrations-mysql",
      "20260804000000_mysql_baseline",
      "migration.sql",
    );

    expect(config).toContain('path: "prisma/migrations-mysql"');
    expect(sqliteSchema).toContain('provider = "sqlite"');
    expect(sqliteLock).toContain('provider = "sqlite"');
    expect(sqliteMigrations.some((entry) => /^\d{14}_/.test(entry))).toBe(true);
    expect(existsSync(mysqlBaseline)).toBe(true);
    expect(readProjectFile("prisma", "migrations-mysql", "migration_lock.toml")).toContain(
      'provider = "mysql"',
    );
  });

  it("packages only the active MySQL migration history in release artifacts", () => {
    const releaseArtifact = readProjectFile("scripts", "create-release-artifact.mjs");

    expect(releaseArtifact).toContain(
      'copyTrackedRuntimeFiles(trackedFiles, "prisma/migrations-mysql", partialPath)',
    );
    expect(releaseArtifact).not.toContain(
      'copyTrackedRuntimeFiles(trackedFiles, "prisma/migrations", partialPath)',
    );
  });

  it("pins MySQL-native temporal and decimal storage", () => {
    const schema = readProjectFile("prisma", "schema.prisma");
    const dateTimeLines = schema
      .split(/\r?\n/)
      .filter((line) => /^\s+\w+\s+DateTime\??\b/.test(line));

    expect(schema).toContain('provider = "mysql"');
    expect(dateTimeLines.length).toBeGreaterThan(0);
    expect(dateTimeLines.every((line) => line.includes("@db.DateTime(3)"))).toBe(true);

    expect(schema).toMatch(/cashAmount\s+Decimal\s+@default\(1000000\)\s+@db\.Decimal\(30, 8\)/);
    expect(schema).toMatch(/quantity\s+Decimal\s+@db\.Decimal\(36, 12\)/);
    expect(schema).toMatch(/dailyRepoRate\s+Decimal\s+@default\(0\.00125\)\s+@db\.Decimal\(36, 12\)/);
    expect(schema).toMatch(/realizedPnlPercent\s+Decimal\?\s+@db\.Decimal\(24, 12\)/);
    expect(schema).toMatch(/amountTry\s+Decimal\s+@db\.Decimal\(30, 8\)/);
  });

  it("uses deliberate MySQL string storage for keys and unbounded content", () => {
    const schema = readProjectFile("prisma", "schema.prisma");
    const scalarStringLines = schema
      .split(/\r?\n/)
      .filter((line) => /^\s+\w+\s+String\??\b/.test(line));

    expect(scalarStringLines.length).toBeGreaterThan(0);
    expect(
      scalarStringLines.every((line) =>
        /@db\.(?:VarChar\(\d+\)|Text|LongText)(?!\w)/.test(line),
      ),
    ).toBe(true);
    expect(schema).toMatch(/body\s+String\s+@db\.LongText/);
    expect(schema).toMatch(/macroSummary\s+String\s+@db\.LongText/);
    expect(schema).toMatch(/emailError\s+String\?\s+@db\.Text/);
    expect(schema).toMatch(/note\s+String\?\s+@db\.Text/);
    expect(schema).toMatch(/eventHash\s+String\s+@unique\s+@db\.VarChar\(128\)/);
    expect(schema).toMatch(/tokenHash\s+String\s+@unique\s+@db\.VarChar\(128\)/);
  });

  it("exposes the MySQL backup and SQLite-to-MySQL ETL scripts", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["operations:backup"]).toBe("node scripts/backup-mysql.mjs");
    expect(packageJson.scripts["db:sqlite-to-mysql"]).toBe(
      "node scripts/sqlite-to-mysql-etl.mjs",
    );
  });

  it("makes utf8mb4 collation and MySQL JSON/decimal types explicit in the baseline", () => {
    const migration = readProjectFile(
      "prisma",
      "migrations-mysql",
      "20260804000000_mysql_baseline",
      "migration.sql",
    );
    const createTableCount = (migration.match(/CREATE TABLE `/g) ?? []).length;
    const collatedTableCount = (
      migration.match(/DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;/g) ?? []
    ).length;

    expect(migration).toContain("MySQL 8.0.44");
    expect(migration).toContain("SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;");
    expect(createTableCount).toBeGreaterThan(0);
    expect(collatedTableCount).toBe(createTableCount);
    expect(migration).toContain(" JSON ");
    expect(migration).toContain("DECIMAL(30, 8)");
    expect(migration).toContain("DECIMAL(36, 12)");
    expect(migration).toContain("DECIMAL(24, 12)");
    expect(migration).toContain("DATETIME(3)");
    expect(migration).toContain("LONGTEXT");
    expect(migration).toContain(" TEXT ");
    expect(migration).toContain("CREATE TABLE `AuditChainHead`");
    expect(migration).toContain("`eventHash` VARCHAR(128) NOT NULL");
  });
});
