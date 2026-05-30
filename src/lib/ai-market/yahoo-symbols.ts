const YAHOO_PROVIDER_SYMBOLS: Record<string, string> = {
  XAUUSD: "GC=F",
  XAGUSD: "SI=F",
  USDTRY: "USDTRY=X",
  EURTRY: "EURTRY=X",
};

const YAHOO_FALLBACK_SYMBOLS: Record<string, string[]> = {
  XAUUSD: ["XAUUSD=X"],
  XAGUSD: ["XAGUSD=X"],
};

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function resolveYahooProviderSymbol(symbol: string) {
  const normalized = normalizeSymbol(symbol);

  return YAHOO_PROVIDER_SYMBOLS[normalized] ?? symbol.trim();
}

export function getYahooProviderSymbolCandidates(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  const primary = resolveYahooProviderSymbol(symbol);

  return unique([primary, ...(YAHOO_FALLBACK_SYMBOLS[normalized] ?? [])]);
}
