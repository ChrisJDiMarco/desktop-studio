import { getBackendUrl } from "./config";

export type GenerateRequest = {
  prompt: string;
  model?: string;
  max_tokens?: number;
  images?: string[];
  preservePrompt?: boolean;
};

export type GenerateResponse = {
  text: string;
  model: string;
  usage?: unknown;
  citations?: unknown;
  search_results?: unknown;
};

// 90s upper bound — Claude with max_tokens up to ~4–8K usually finishes
// well inside this; we'd rather fail fast than hang the artifact window.
const DEFAULT_TIMEOUT_MS = 90_000;

export async function generate(
  req: GenerateRequest,
  signal?: AbortSignal
): Promise<GenerateResponse> {
  const base = getBackendUrl();
  const url = `${base}/api/generate`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const composite =
    signal !== undefined
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: composite,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Backend ${res.status}: ${body || res.statusText}`);
    }

    return (await res.json()) as GenerateResponse;
  } catch (err: unknown) {
    if (
      err instanceof TypeError &&
      /fetch failed|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/i.test(err.message)
    ) {
      throw new Error(
        `Couldn't reach the backend at ${base}. Is the web app running? (pnpm dev:web)`
      );
    }
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error(
        `Generation timed out after ${DEFAULT_TIMEOUT_MS / 1000}s. Try a smaller prompt or fewer max_tokens.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
