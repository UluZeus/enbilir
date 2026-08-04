import fs from "node:fs";
import path from "node:path";
import { MysqlCliDatabase } from "./lib/mysql-cli.mjs";
import { loadLocalEnvironment } from "./lib/operations.mjs";

const contentPath = path.resolve("src/data/enbilir-icerik2-content.json");
const sourceItems = JSON.parse(fs.readFileSync(contentPath, "utf8"));
loadLocalEnvironment();
const db = new MysqlCliDatabase();
const now = new Date();

const stmt = db.prepare(`
  INSERT INTO ManagedContentItem (
    id, type, locale, title, excerpt, body, imageUrl, videoUrl, linkUrl, linkLabel,
    sortOrder, isFeatured, isActive, publishedAt, createdAt, updatedAt
  ) VALUES (
    @id, @type, @locale, @title, @excerpt, @body, NULL, NULL, NULL, NULL,
    @sortOrder, @isFeatured, 1, @publishedAt, @createdAt, @updatedAt
  )
  ON DUPLICATE KEY UPDATE
    type = VALUES(type), locale = VALUES(locale), title = VALUES(title),
    excerpt = VALUES(excerpt), body = VALUES(body), sortOrder = VALUES(sortOrder),
    isFeatured = VALUES(isFeatured), isActive = VALUES(isActive),
    publishedAt = VALUES(publishedAt), updatedAt = VALUES(updatedAt)
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

console.log(`Upserted ${rows.length} managed content rows from Enbiliriçerik2.`);
