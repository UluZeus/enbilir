import type { Candle } from "@/lib/ai-market/types";
import { normalizeProviderCandles } from "@/lib/ai-market/candle-quality";
import { withProviderRetry } from "@/lib/ai-market/provider-resilience";

type GateCandle = [string, string, string, string, string, string, string?];

function toNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchGateCandles(currencyPair: string, interval = "1h", limit = 240, timeoutMs = 5000): Promise<Candle[]> {
  const url = new URL("https://api.gateio.ws/api/v4/spot/candlesticks");
  url.searchParams.set("currency_pair", currencyPair);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));
  const rows = await withProviderRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gate.io public data unavailable (${response.status})`);
      }

      const payload = await response.json() as unknown;

      if (!Array.isArray(payload)) {
        throw new Error("Unexpected Gate.io candle payload");
      }

      return payload as GateCandle[];
    } finally {
      clearTimeout(timeoutId);
    }
  }, { maxAttempts: 2 });

  return normalizeProviderCandles(rows
    .filter((row): row is GateCandle => Array.isArray(row) && row.length >= 6)
    .map((row) => ({
      openTime: toNumber(row[0]) * 1000,
      volume: toNumber(row[1]),
      close: toNumber(row[2]),
      high: toNumber(row[3]),
      low: toNumber(row[4]),
      open: toNumber(row[5]),
    }))).candles;
}
