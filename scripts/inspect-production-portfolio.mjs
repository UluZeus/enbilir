#!/usr/bin/env node
import { MysqlCliDatabase } from "./lib/mysql-cli.mjs";
import { loadLocalEnvironment } from "./lib/operations.mjs";

console.warn(
  "WARNING: This read-only aggregate inspection uses persisted cost basis and is not authoritative live valuation or release evidence.",
);

loadLocalEnvironment();
const database = new MysqlCliDatabase();
const totals = database.prepare(`
  SELECT
    (SELECT COUNT(*) FROM \`User\`) AS users,
    (SELECT COUNT(*) FROM \`VirtualAccount\`) AS accounts,
    (SELECT COUNT(*) FROM \`PortfolioPosition\`) AS positions,
    (SELECT COUNT(*) FROM \`VirtualTrade\`) AS trades,
    (SELECT COUNT(*) FROM \`PortfolioSnapshot\`) AS snapshots,
    (SELECT COUNT(*) FROM \`User\` u
      WHERE EXISTS (SELECT 1 FROM \`VirtualTrade\` t WHERE t.userId = u.id)
        AND NOT EXISTS (SELECT 1 FROM \`PortfolioPosition\` p WHERE p.userId = u.id)) AS tradedWithoutOpenPosition
`).get();
const cashByMode = database.prepare(`
  SELECT cashMode, COUNT(*) AS accounts, CAST(SUM(cashAmount) AS CHAR) AS aggregateCash
  FROM \`VirtualAccount\` GROUP BY cashMode ORDER BY cashMode
`).all();
const positionAggregate = database.prepare(`
  SELECT COUNT(DISTINCT userId) AS usersWithPositions,
         CAST(SUM(quantity * averagePriceUsd) AS CHAR) AS aggregateCostBasisValueUsd
  FROM \`PortfolioPosition\`
`).get();

console.log(JSON.stringify({
  mode: "READ_ONLY_AGGREGATE",
  totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Number(value)])),
  cashByMode: cashByMode.map((row) => ({
    cashMode: row.cashMode,
    accounts: Number(row.accounts),
    aggregateCash: row.aggregateCash,
  })),
  positionAggregate: {
    usersWithPositions: Number(positionAggregate.usersWithPositions),
    aggregateCostBasisValueUsd: positionAggregate.aggregateCostBasisValueUsd,
  },
}));
