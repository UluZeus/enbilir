# Database histories

- `migrations-mysql/` is the active Prisma Migrate history for the MySQL 8 runtime. `prisma.config.ts` points only to this directory.
- `migrations/` and `schema.sqlite.prisma` are the preserved SQLite source history and schema. They are inputs for migration rehearsal and SQLite-to-MySQL ETL; they must never be deployed to MySQL.

The MySQL baseline was generated offline from `schema.prisma`. Its table collation is deliberately pinned to `utf8mb4_0900_ai_ci`, which requires MySQL 8. The target database must be created with the same character set and collation before deployment.
