import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type FetchJsonOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
  next?: {
    revalidate?: number;
  };
};

function normalizeHeaders(headers: Record<string, string> | undefined) {
  return {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
    ...headers,
  };
}

async function fetchJsonWithNativeFetch<T>(url: string, options: Required<FetchJsonOptions>): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      cache: options.next.revalidate === undefined ? "no-store" : undefined,
      headers: options.headers,
      next: options.next.revalidate === undefined ? undefined : { revalidate: options.next.revalidate },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`JSON request failed (${response.status})`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJsonWithCurl<T>(url: string, options: Required<FetchJsonOptions>): Promise<T> {
  const args = [
    "--location",
    "--silent",
    "--show-error",
    "--fail",
    "--max-time",
    String(Math.max(1, Math.ceil(options.timeoutMs / 1000))),
  ];

  for (const [key, value] of Object.entries(options.headers)) {
    args.push("--header", `${key}: ${value}`);
  }

  if (process.platform === "win32") {
    args.push("--ssl-no-revoke");
  }

  args.push(url);

  const { stdout } = await execFileAsync(process.platform === "win32" ? "curl.exe" : "curl", args, {
    maxBuffer: 20 * 1024 * 1024,
    timeout: options.timeoutMs + 3_000,
  });

  return JSON.parse(stdout.trim()) as T;
}

export async function fetchJsonWithFallback<T>(url: string | URL, options: FetchJsonOptions = {}): Promise<T> {
  const requestUrl = String(url);
  const normalizedOptions: Required<FetchJsonOptions> = {
    timeoutMs: options.timeoutMs ?? 12_000,
    headers: normalizeHeaders(options.headers),
    next: options.next ?? {},
  };

  try {
    return await fetchJsonWithNativeFetch<T>(requestUrl, normalizedOptions);
  } catch (nativeError) {
    try {
      return await fetchJsonWithCurl<T>(requestUrl, normalizedOptions);
    } catch {
      throw nativeError;
    }
  }
}
