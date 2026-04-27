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

// 90s upper bound for text — Claude with max_tokens up to ~64K usually
// finishes well inside this; we'd rather fail fast than hang the
// artifact window.
const DEFAULT_TIMEOUT_MS = 360_000;
const IMAGE_TIMEOUT_MS = 90_000;
const VIDEO_TIMEOUT_MS = 240_000;

export type GenerateImageRequest = {
  prompt: string;
  aspectRatio?: string;
  model?: string;
};

export type GenerateImageResponse = {
  url: string;
  model?: string;
  aspectRatio?: string;
};

export type GenerateVideoRequest = {
  prompt: string;
  quality?: string;
  duration?: string;
  aspectRatio?: string;
  resolution?: string;
  model?: string;
  generateAudio?: boolean;
};

export type GenerateVideoResponse = {
  url: string;
  videoUrl?: string;
  provider?: string;
  model?: string;
  requestId?: string;
};

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

async function postJson<T>(
  path: string,
  body: unknown,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<T> {
  const base = getBackendUrl();
  const url = `${base}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const composite =
    signal !== undefined
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: composite,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Backend ${res.status}: ${text || res.statusText}`);
    }
    return (await res.json()) as T;
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
        `Request timed out after ${timeoutMs / 1000}s.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateImage(
  req: GenerateImageRequest,
  signal?: AbortSignal
): Promise<GenerateImageResponse> {
  const data = await postJson<
    GenerateImageResponse | { error?: string; url?: string; imageUrl?: string }
  >("/api/generate-image", req, IMAGE_TIMEOUT_MS, signal);
  const url =
    typeof data === "string"
      ? data
      : (data as { url?: string }).url ??
        (data as { imageUrl?: string }).imageUrl;
  if (!url || typeof url !== "string") {
    throw new Error(
      (data as { error?: string }).error || "Image generation returned no URL"
    );
  }
  return {
    url,
    model: (data as { model?: string }).model,
    aspectRatio: (data as { aspectRatio?: string }).aspectRatio,
  };
}

export async function generateVideo(
  req: GenerateVideoRequest,
  signal?: AbortSignal
): Promise<GenerateVideoResponse> {
  const data = await postJson<
    GenerateVideoResponse | { error?: string; url?: string; videoUrl?: string }
  >("/api/generate-video", req, VIDEO_TIMEOUT_MS, signal);
  const url =
    typeof data === "string"
      ? data
      : (data as { videoUrl?: string }).videoUrl ??
        (data as { url?: string }).url;
  if (!url || typeof url !== "string") {
    throw new Error(
      (data as { error?: string }).error || "Video generation returned no URL"
    );
  }
  return {
    url,
    videoUrl: url,
    model: (data as { model?: string }).model,
    requestId: (data as { requestId?: string }).requestId,
    provider: (data as { provider?: string }).provider,
  };
}
