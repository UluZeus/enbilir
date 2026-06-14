import { fetchJsonWithFallback } from "@/lib/http-json";
import type { Candle } from "@/lib/ai-market/types";

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchBinanceCandles(symbol: string, interval = "1h", limit = 240, timeoutMs = 5000): Promise<Candle[]> {
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const rows = await fetchJsonWithFallback<BinanceKline[]>(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
    timeoutMs,
  });

  return rows.map((row) => ({
    openTime: row[0],
    open: toNumber(row[1]),
    high: toNumber(row[2]),
    low: toNumber(row[3]),
    close: toNumber(row[4]),
    volume: toNumber(row[5]),
  }));
}
