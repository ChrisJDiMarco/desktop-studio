import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

type SupportedMime =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp";

const SUPPORTED_MIMES: SupportedMime[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

function pickMime(raw: string | null, fallback: SupportedMime = "image/png"): SupportedMime {
  if (!raw) return fallback;
  const lower = raw.toLowerCase().split(";")[0].trim();
  if (lower === "image/jpg") return "image/jpeg";
  return (SUPPORTED_MIMES as string[]).includes(lower) ? (lower as SupportedMime) : fallback;
}

function parseDataUrl(dataUrl: string): { media_type: SupportedMime; data: string } | null {
  const commaIdx = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || commaIdx < 0) return null;
  const header = dataUrl.slice(5, commaIdx);
  const rest = dataUrl.slice(commaIdx + 1);
  const parts = header.split(";").map((p) => p.trim()).filter(Boolean);
  const declaredMime = parts.find((p) => p.includes("/")) || null;
  const isBase64 = parts.some((p) => p.toLowerCase() === "base64");
  const data = isBase64
    ? rest
    : Buffer.from(decodeURIComponent(rest), "utf-8").toString("base64");
  return { media_type: pickMime(declaredMime), data };
}

async function fetchImageAsBase64(
  url: string
): Promise<{ media_type: SupportedMime; data: string }> {
  if (url.startsWith("data:")) {
    const parsed = parseDataUrl(url);
    if (!parsed) throw new Error("Invalid data URL");
    return parsed;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status} ${res.statusText})`);
  }
  const media_type = pickMime(res.headers.get("content-type"));
  const buf = Buffer.from(await res.arrayBuffer());
  return { media_type, data: buf.toString("base64") };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      imageUrl?: unknown;
      prompt?: unknown;
      model?: unknown;
      max_tokens?: unknown;
    };
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
    if (!apiKey || apiKey.startsWith("your-")) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const prompt = typeof body.prompt === "string" && body.prompt ? body.prompt : "Analyze this image in detail.";
    const model = typeof body.model === "string" && body.model ? body.model : "claude-sonnet-4-6";
    const requestedMaxTokens =
      typeof body.max_tokens === "number" && Number.isFinite(body.max_tokens)
        ? Math.min(Math.max(256, Math.floor(body.max_tokens as number)), 16000)
        : 4000;

    let image;
    try {
      image = await fetchImageAsBase64(imageUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load image";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    try {
      const response = await client.messages.create({
        model,
        max_tokens: requestedMaxTokens,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.media_type,
                  data: image.data,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

      return NextResponse.json({ text, model, usage: response.usage ?? null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Anthropic vision error";
      console.error("Analyze-image Anthropic error:", err);
      return NextResponse.json(
        { error: `Anthropic vision error: ${message}` },
        { status: 502 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image analysis failed";
    console.error("Analyze-image error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
