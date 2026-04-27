import { NextRequest, NextResponse } from "next/server";

type ImagenAspect = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

const IMAGEN_MODELS = [
  "imagen-4.0-generate-001",
  "imagen-3.0-generate-002",
  "imagen-3.0-generate-001",
] as const;

const ALLOWED_ASPECTS: ImagenAspect[] = ["1:1", "3:4", "4:3", "9:16", "16:9"];

function normalizeAspect(raw: unknown): ImagenAspect {
  if (typeof raw === "string" && (ALLOWED_ASPECTS as string[]).includes(raw)) {
    return raw as ImagenAspect;
  }
  return "1:1";
}

async function imagenPredict(model: string, apiKey: string, prompt: string, aspectRatio: ImagenAspect) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predict?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio,
        safetyFilterLevel: "block_only_high",
        personGeneration: "allow_adult",
      },
    }),
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }

  if (!res.ok) {
    const errorShape = parsed as { error?: { message?: string; status?: string } } | null;
    const message = errorShape?.error?.message || text || `${res.status} ${res.statusText}`;
    return { ok: false as const, status: res.status, message };
  }

  const data = parsed as {
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    promptFeedback?: { blockReason?: string };
  } | null;
  const pred = data?.predictions?.[0];
  const b64 = pred?.bytesBase64Encoded;
  if (!b64) {
    const blockReason = data?.promptFeedback?.blockReason;
    return {
      ok: false as const,
      status: 502,
      message: blockReason
        ? `Imagen declined the prompt (${blockReason})`
        : "Imagen returned no image data",
    };
  }
  const mime = pred?.mimeType || "image/png";
  return { ok: true as const, url: `data:${mime};base64,${b64}` };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      prompt?: unknown;
      aspectRatio?: unknown;
      model?: unknown;
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey || apiKey.startsWith("your-")) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const aspectRatio = normalizeAspect(body.aspectRatio);
    const preferredModel = typeof body.model === "string" && body.model ? body.model : null;
    const modelOrder = preferredModel
      ? [preferredModel, ...IMAGEN_MODELS.filter((m) => m !== preferredModel)]
      : [...IMAGEN_MODELS];

    const failures: string[] = [];
    for (const model of modelOrder) {
      const result = await imagenPredict(model, apiKey, prompt, aspectRatio);
      if (result.ok) {
        return NextResponse.json({ url: result.url, model, aspectRatio });
      }
      failures.push(`${model}: ${result.message}`);
      if (result.status === 400 || result.status === 403) {
        // Prompt/quota/permission errors won't be fixed by trying another model.
        break;
      }
    }

    return NextResponse.json(
      { error: `Imagen generation failed. ${failures.join(" | ")}` },
      { status: 502 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    console.error("Generate-image error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
