/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * aiApi shim — mirrors the Thinklet platform's AI service interface.
 * All calls proxy to local Next.js API routes which call the real providers.
 *
 * Every request runs under a hard timeout so a single hung upstream (Imagen,
 * FAL, Anthropic) cannot stall sequential pipelines that await many calls in
 * series. Callers can pass their own AbortSignal which is composed with the
 * per-request timeout.
 */

import { DEFAULT_AI_MODEL } from "@/lib/ai-models";

const CONTENT_STORAGE_KEY = "desktop-studio-content";

// Hard ceilings on a single round-trip. The API routes themselves can take a
// while (Imagen ≈ 10–30s, Veo ≈ 60–180s), so timeouts here are intentionally
// generous — the goal is to prevent infinite hangs, not abort slow-but-working
// requests.
const TIMEOUT_TEXT_MS = 360_000;
const TIMEOUT_IMAGE_MS = 90_000;
const TIMEOUT_VIDEO_MS = 240_000;

function getStoredDefaultAiModel(): string {
  if (typeof window === "undefined") return DEFAULT_AI_MODEL;

  try {
    const raw = window.localStorage.getItem(CONTENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const model = parsed?.appSettings?.defaultAiModel;
    return typeof model === "string" && model ? model : DEFAULT_AI_MODEL;
  } catch {
    return DEFAULT_AI_MODEL;
  }
}

// Compose an external AbortSignal with an internal timeout. Either firing
// aborts the request. Returns the merged signal plus a `cleanup` to clear the
// timer on success so we don't leak.
function withTimeout(externalSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, "TimeoutError")),
    timeoutMs,
  );
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), { once: true });
    }
  }
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

async function post(
  url: string,
  body: any,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<any> {
  const { signal: composed, cleanup } = withTimeout(signal, timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: composed,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw err;
  } finally {
    cleanup();
  }
}

export const aiApi = {
  async generate(params: {
    prompt: string;
    model?: string;
    max_tokens?: number;
    signal?: AbortSignal;
    preservePrompt?: boolean;
    /**
     * Optional vision context. Each entry must be a base64 data URL
     * (`data:image/png;base64,...`). The route only forwards images to
     * vision-capable providers (Anthropic, OpenAI); for text-only providers
     * (DeepSeek, Perplexity) the images are dropped server-side and the call
     * still succeeds with text-only context.
     */
    images?: string[];
  }): Promise<string> {
    const { signal, ...body } = params;
    const model = body.model || getStoredDefaultAiModel();
    const data = await post("/api/generate", { ...body, model }, signal, TIMEOUT_TEXT_MS);
    return data.text ?? data;
  },

  async generateImage(params: {
    prompt: string;
    aspectRatio?: string;
    model?: string;
    signal?: AbortSignal;
  }): Promise<{ url: string; model?: string; aspectRatio?: string }> {
    const { signal, ...body } = params;
    const data = await post("/api/generate-image", body, signal, TIMEOUT_IMAGE_MS);
    // Validate the API actually returned a usable URL — otherwise treat as a
    // failure so callers can drop the placeholder instead of leaving a broken
    // <img src="undefined"> on the desktop.
    const url = typeof data === "string" ? data : data?.url || data?.imageUrl;
    if (typeof url !== "string" || !url) {
      throw new Error(data?.error || "Image generation returned no URL");
    }
    return { ...(data && typeof data === "object" ? data : {}), url };
  },

  async generateVideo(params: {
    prompt: string;
    quality?: string;
    duration?: string;
    aspectRatio?: string;
    resolution?: string;
    model?: string;
    generateAudio?: boolean;
    signal?: AbortSignal;
  }): Promise<{ url: string; videoUrl?: string; provider?: string; model?: string; requestId?: string }> {
    const { signal, ...body } = params;
    const data = await post("/api/generate-video", body, signal, TIMEOUT_VIDEO_MS);
    const url = typeof data === "string" ? data : data?.videoUrl || data?.url;
    if (typeof url !== "string" || !url) {
      throw new Error(data?.error || "Video generation returned no URL");
    }
    return { ...(data && typeof data === "object" ? data : {}), url };
  },

  async analyzeImage(params: {
    imageUrl: string;
    prompt?: string;
    model?: string;
    signal?: AbortSignal;
  }): Promise<string> {
    const { signal, ...body } = params;
    const data = await post("/api/analyze-image", body, signal, TIMEOUT_TEXT_MS);
    return data.text ?? data;
  },

  async generateAppProject(params: {
    artifact: {
      id?: string;
      title?: string;
      type?: string;
      language?: string;
      content?: string;
      mediaUrl?: string | null;
      width?: number;
      height?: number;
    };
    model?: string;
    signal?: AbortSignal;
  }): Promise<{
    title: string;
    slug: string;
    description?: string;
    entryPath?: string;
    previewHtml?: string;
    files: Array<{ path: string; content: string }>;
    providerModel?: string | null;
    warnings?: string[];
  }> {
    const { signal, ...body } = params;
    const model = body.model || getStoredDefaultAiModel();
    return await post("/api/artifact-app", { ...body, model }, signal, TIMEOUT_TEXT_MS);
  },
};
