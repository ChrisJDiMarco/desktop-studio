import { NextRequest, NextResponse } from "next/server";

const FAL_QUEUE_BASE = "https://queue.fal.run";
const DEFAULT_FAL_VIDEO_MODEL = "bytedance/seedance-2.0/text-to-video";

const ALLOWED_ASPECTS = ["auto", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"] as const;
const ALLOWED_DURATIONS = ["auto", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"] as const;
const ALLOWED_RESOLUTIONS = ["480p", "720p", "1080p"] as const;

type FalJson = Record<string, unknown>;

function normalizeEnum<T extends readonly string[]>(
  raw: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  const value = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

function getFalApiKey() {
  return (
    process.env.FAL_KEY ||
    process.env.FAL_API_KEY ||
    process.env.FAL_API_TOKEN ||
    ""
  ).trim();
}

function getFalModel(raw: unknown) {
  const requested = typeof raw === "string" ? raw.trim() : "";
  const configured = (process.env.FAL_VIDEO_MODEL || DEFAULT_FAL_VIDEO_MODEL).trim();
  const model = requested || configured || DEFAULT_FAL_VIDEO_MODEL;
  return model.replace(/^\/+|\/+$/g, "");
}

function falUrl(model: string, suffix = "") {
  return `${FAL_QUEUE_BASE}/${model}${suffix}`;
}

async function falJson(url: string, options: RequestInit, apiKey: string): Promise<FalJson> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const errorShape = parsed as { error?: string; detail?: string; message?: string } | null;
    const detail = errorShape?.error || errorShape?.detail || errorShape?.message || text;
    throw new Error(`FAL API error ${res.status}: ${detail || res.statusText}`);
  }

  return (parsed && typeof parsed === "object" ? parsed : {}) as FalJson;
}

function withLogs(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.set("logs", "1");
  return parsed.toString();
}

function asObject(value: unknown): FalJson | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as FalJson) : null;
}

function getNestedUrl(value: unknown) {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  const obj = asObject(value);
  const url = obj?.url;
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

function extractVideoUrl(result: FalJson) {
  const containers = [
    result,
    asObject(result.data),
    asObject(result.output),
    asObject(result.result),
    asObject(result.payload),
  ].filter(Boolean) as FalJson[];

  for (const container of containers) {
    const direct = getNestedUrl(container.video);
    if (direct) return direct;

    const videoUrl = container.videoUrl || container.video_url;
    if (typeof videoUrl === "string" && /^https?:\/\//i.test(videoUrl)) return videoUrl;

    const videos = Array.isArray(container.videos) ? container.videos : [];
    for (const video of videos) {
      const nested = getNestedUrl(video);
      if (nested) return nested;
    }

    const url = container.url;
    const contentType = container.content_type || container.contentType;
    if (
      typeof url === "string" &&
      /^https?:\/\//i.test(url) &&
      (typeof contentType !== "string" || contentType.startsWith("video/"))
    ) {
      return url;
    }
  }

  return null;
}

function buildFalInput(body: Record<string, unknown>, prompt: string) {
  const quality = typeof body.quality === "string" ? body.quality.toLowerCase() : "";
  const resolutionFallback = quality === "draft" || quality === "fast" ? "480p" : "720p";
  const generateAudio =
    typeof body.generateAudio === "boolean"
      ? body.generateAudio
      : typeof body.generate_audio === "boolean"
        ? body.generate_audio
        : false;

  const input: Record<string, unknown> = {
    prompt,
    resolution: normalizeEnum(body.resolution, ALLOWED_RESOLUTIONS, resolutionFallback),
    duration: normalizeEnum(body.duration, ALLOWED_DURATIONS, "5"),
    aspect_ratio: normalizeEnum(body.aspectRatio || body.aspect_ratio, ALLOWED_ASPECTS, "16:9"),
    generate_audio: generateAudio,
  };

  const seed = typeof body.seed === "number" && Number.isFinite(body.seed) ? Math.floor(body.seed) : null;
  if (seed !== null) input.seed = seed;

  const endUserId =
    (typeof body.endUserId === "string" && body.endUserId.trim()) ||
    (typeof body.end_user_id === "string" && body.end_user_id.trim()) ||
    process.env.FAL_END_USER_ID ||
    "";
  if (endUserId) input.end_user_id = endUserId;

  return input;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const apiKey = getFalApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing FAL_KEY in .env.local. FAL_API_KEY and FAL_API_TOKEN are also supported." },
        { status: 500 }
      );
    }

    const model = getFalModel(body.model);
    const submission = await falJson(
      falUrl(model),
      {
        method: "POST",
        body: JSON.stringify(buildFalInput(body, prompt)),
      },
      apiKey
    );

    const requestId =
      typeof submission.request_id === "string"
        ? submission.request_id
        : typeof submission.requestId === "string"
          ? submission.requestId
          : "";
    if (!requestId) throw new Error("No request_id returned from FAL");

    const statusUrl =
      typeof submission.status_url === "string"
        ? submission.status_url
        : falUrl(model, `/requests/${encodeURIComponent(requestId)}/status`);
    let responseUrl =
      typeof submission.response_url === "string"
        ? submission.response_url
        : falUrl(model, `/requests/${encodeURIComponent(requestId)}`);

    const maxAttempts = 84;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, i === 0 ? 1500 : 5000));
      const status = await falJson(withLogs(statusUrl), { method: "GET" }, apiKey);
      if (typeof status.response_url === "string") responseUrl = status.response_url;

      if (status.status === "COMPLETED") {
        const inlineUrl = extractVideoUrl(status);
        const result = inlineUrl ? status : await falJson(responseUrl, { method: "GET" }, apiKey);
        const url = inlineUrl || extractVideoUrl(result);
        if (!url) throw new Error("FAL completed but did not return a video URL");
        return NextResponse.json({
          url,
          videoUrl: url,
          provider: "FAL",
          model,
          requestId,
          seed: (result.seed || status.seed) ?? null,
        });
      }

      if (status.status === "FAILED" || status.error) {
        const error = typeof status.error === "string" ? status.error : "unknown";
        throw new Error(`FAL generation failed: ${error}`);
      }
    }

    throw new Error("Video generation timed out while waiting for FAL");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Video generation failed";
    console.error("Generate-video error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
