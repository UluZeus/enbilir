import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function readEnvFile() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      }),
  );
}

function getDatabasePath() {
  const env = { ...readEnvFile(), ...process.env };
  const databaseUrl = env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only SQLite file DATABASE_URL values are supported by this script. Received: ${databaseUrl}`);
  }

  const filePath = databaseUrl.replace(/^file:/, "");
  return path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
}

const contentPath = path.resolve("src/data/enbilir-icerik2-content.json");
const sourceItems = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const dbPath = getDatabasePath();
const db = new Database(dbPath);
const now = new Date().toISOString();

const stmt = db.prepare(`
  INSERT INTO ManagedContentItem (
    id, type, locale, title, excerpt, body, imageUrl, videoUrl, linkUrl, linkLabel,
    sortOrder, isFeatured, isActive, publishedAt, createdAt, updatedAt
  ) VALUES (
    @id, @type, @locale, @title, @excerpt, @body, NULL, NULL, NULL, NULL,
    @sortOrder, @isFeatured, 1, @publishedAt, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    type = excluded.type,
    locale = excluded.locale,
    title = excluded.title,
    excerpt = excluded.excerpt,
    body = excluded.body,
    sortOrder = excluded.sortOrder,
    isFeatured = excluded.isFeatured,
    isActive = excluded.isActive,
    publishedAt = excluded.publishedAt,
    updatedAt = excluded.updatedAt
`);

const rows = sourceItems
  .filter((item) => item.section === "BLOG" || item.section === "EDUCATION")
  .flatMap((item) => [
    {
      id: item.idBase,
      type: item.section,
      locale: "tr",
      title: item.tr.title,
      excerpt: item.tr.excerpt,
      body: item.tr.body,
      sortOrder: item.sortOrder,
      isFeatured: item.section === "BLOG" ? 1 : 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${item.idBase}-en`,
      type: item.section,
      locale: "en",
      title: item.en.title,
      excerpt: item.en.excerpt,
      body: item.en.body,
      sortOrder: item.sortOrder,
      isFeatured: item.section === "BLOG" ? 1 : 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]);

db.transaction(() => {
  for (const row of rows) {
    stmt.run(row);
  }
})();

console.log(`Upserted ${rows.length} managed content rows from Enbiliriçerik2 into ${dbPath}`);
