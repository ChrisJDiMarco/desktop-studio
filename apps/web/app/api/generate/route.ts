import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { DEFAULT_AI_MODEL } from "@desktop-studio/core";

// Load DESIGN.md tokens once at module init — injected as system prompt on every AI call.
// The YAML front matter is extracted so agents get exact token values (colors, type, spacing)
// without needing to parse the full markdown body.
function loadDesignMdSystem(): string {
  try {
    const src = fs.readFileSync(path.join(process.cwd(), "DESIGN.md"), "utf8");
    const match = src.match(/^---\n([\s\S]*?)\n---/);
    const tokens = match?.[1] ?? "";
    const bodyMatch = src.match(/^---[\s\S]*?---\n([\s\S]*)$/);
    const body = (bodyMatch?.[1] ?? "").substring(0, 3000); // cap prose at 3k chars
    return [
      "# DESIGN.md — Desktop Studio design system",
      "## Machine-readable tokens (authoritative values)",
      "```yaml",
      tokens,
      "```",
      "",
      "## Design rationale (condensed)",
      body.trim(),
    ].join("\n");
  } catch {
    return "";
  }
}

const DESIGN_MD_SYSTEM = loadDesignMdSystem();

// Perplexity per-model max output tokens. Values are conservative upper bounds
// that the sonar API will accept; anything higher produces a 400 from
// https://api.perplexity.ai/chat/completions.
const PERPLEXITY_MAX_TOKENS: Record<string, number> = {
  sonar: 4000,
  "sonar-pro": 8000,
  "sonar-reasoning": 8000,
  "sonar-reasoning-pro": 8000,
  "sonar-deep-research": 8000,
};

function clampPerplexityTokens(model: string, requested: number | undefined): number {
  const cap = PERPLEXITY_MAX_TOKENS[model] ?? 4000;
  if (typeof requested !== "number" || !Number.isFinite(requested) || requested <= 0) {
    return cap;
  }
  return Math.min(Math.max(256, Math.floor(requested)), cap);
}

function isAnthropicModel(model: string | undefined): boolean {
  if (!model) return true;
  const m = model.toLowerCase();
  return m.includes("claude") || m.includes("sonnet") || m.includes("opus") || m.includes("haiku");
}

function isPerplexityModel(model: string | undefined): boolean {
  if (!model) return false;
  return model.toLowerCase().includes("sonar");
}

function isDeepSeekModel(model: string | undefined): boolean {
  if (!model) return false;
  return model.toLowerCase().startsWith("deepseek-");
}

function openAIErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { status?: number; message?: string; error?: { message?: string } };
    if (e.error?.message) return e.error.message;
    if (e.message) return e.message;
    if (typeof e.status === "number") return `HTTP ${e.status}`;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

// Defense-in-depth boundary scrub. Imagen/FAL data URLs are ~1-3MB each; even
// one accidentally inlined in a prompt blows past provider context windows
// (DeepSeek ~1M tokens; Anthropic 800K tokens/min rate limit). The client-side
// compactPromptText already strips these, but a server-side strip catches any
// path that bypasses it.
const SERVER_PROMPT_LIMIT_CHARS = 600_000;
function sanitizePrompt(raw: string, options: { preservePrompt?: boolean } = {}): string {
  let text = raw;
  text = text.replace(
    /data:[^"'\s)]+;base64,[A-Za-z0-9+/=]+/g,
    (m) => `[data URL omitted: ${m.length} chars]`,
  );
  if (!options.preservePrompt && text.length > SERVER_PROMPT_LIMIT_CHARS) {
    text =
      text.slice(0, SERVER_PROMPT_LIMIT_CHARS) +
      `\n\n[server-side: prompt truncated from ${text.length} to ${SERVER_PROMPT_LIMIT_CHARS} chars]`;
  }
  return text;
}

// Vision attachments are passed as base64 data URLs from the prompt bar
// (paste / drop / file picker → FileReader). We cap count and per-image size
// here so a malicious or runaway client can't flood the provider with 50
// 8MB photos. Anthropic's per-image hard limit is ~5MB after base64
// expansion; we leave a small safety margin.
const MAX_VISION_IMAGES = 8;
const MAX_VISION_IMAGE_BYTES = 4_500_000;
type VisionImage = { mediaType: string; base64: string };

function parseVisionImages(raw: unknown): VisionImage[] {
  if (!Array.isArray(raw)) return [];
  const out: VisionImage[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const match = entry.match(/^data:([\w./+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) continue;
    const [, mediaType, base64] = match;
    if (!mediaType.startsWith("image/")) continue;
    // base64 length × 3/4 ≈ decoded bytes
    const approxBytes = Math.floor((base64.length * 3) / 4);
    if (approxBytes > MAX_VISION_IMAGE_BYTES) continue;
    out.push({ mediaType, base64 });
    if (out.length >= MAX_VISION_IMAGES) break;
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      prompt?: unknown;
      model?: unknown;
      max_tokens?: unknown;
      images?: unknown;
      preservePrompt?: unknown;
    };
    const rawPrompt = typeof body.prompt === "string" ? body.prompt : "";
    if (!rawPrompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const prompt = sanitizePrompt(rawPrompt, { preservePrompt: body.preservePrompt === true });
    const visionImages = parseVisionImages(body.images);

    const model = typeof body.model === "string" && body.model ? body.model : undefined;
    const requestedMaxTokens =
      typeof body.max_tokens === "number" && Number.isFinite(body.max_tokens)
        ? (body.max_tokens as number)
        : 16000;

    // ── Perplexity (sonar family) ─────────────────────────────────────────
    if (isPerplexityModel(model)) {
      const apiKey = (process.env.PERPLEXITY_API_KEY || "").trim();
      if (!apiKey || apiKey.startsWith("your-")) {
        return NextResponse.json(
          { error: "Missing PERPLEXITY_API_KEY in .env.local" },
          { status: 500 }
        );
      }

      const resolvedModel = model as string;
      const maxTokens = clampPerplexityTokens(resolvedModel, requestedMaxTokens);

      try {
        const pplx = new OpenAI({ apiKey, baseURL: "https://api.perplexity.ai" });
        const res = await pplx.chat.completions.create({
          model: resolvedModel,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.2,
        });
        const text = res.choices?.[0]?.message?.content ?? "";
        // Perplexity returns citations/search_results on the response object even
        // though the OpenAI typings don't know about them. Forward whatever the
        // API hands back so callers can render sources.
        const raw = res as unknown as {
          citations?: unknown;
          search_results?: unknown;
          usage?: unknown;
        };
        return NextResponse.json({
          text,
          citations: raw.citations ?? null,
          search_results: raw.search_results ?? null,
          usage: raw.usage ?? null,
          model: resolvedModel,
        });
      } catch (err) {
        const message = openAIErrorMessage(err);
        console.error("Perplexity error:", err);
        return NextResponse.json(
          { error: `Perplexity API error: ${message}`, model: resolvedModel },
          { status: 502 }
        );
      }
    }

    // ── DeepSeek (OpenAI-compatible V4 family) ────────────────────────────
    if (isDeepSeekModel(model)) {
      const apiKey = (process.env.DEEPSEEK_API_KEY || "").trim();
      if (!apiKey || apiKey.startsWith("your-")) {
        return NextResponse.json(
          { error: "Missing DEEPSEEK_API_KEY in .env.local" },
          { status: 500 }
        );
      }

      const resolvedModel = model as string;

      try {
        const deepseek = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
        const res = await deepseek.chat.completions.create({
          model: resolvedModel,
          messages: [
            ...(DESIGN_MD_SYSTEM ? [{ role: "system" as const, content: DESIGN_MD_SYSTEM }] : []),
            { role: "user" as const, content: prompt },
          ],
          max_tokens: Math.min(Math.max(256, requestedMaxTokens), 64000),
          temperature: 0.2,
        });
        const raw = res as unknown as { usage?: unknown };
        return NextResponse.json({
          text: res.choices?.[0]?.message?.content ?? "",
          usage: raw.usage ?? null,
          model: resolvedModel,
        });
      } catch (err) {
        const message = openAIErrorMessage(err);
        console.error("DeepSeek error:", err);
        return NextResponse.json(
          { error: `DeepSeek API error: ${message}`, model: resolvedModel },
          { status: 502 }
        );
      }
    }

    // ── Anthropic (Claude family, default) ────────────────────────────────
    if (isAnthropicModel(model)) {
      const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
      if (!apiKey || apiKey.startsWith("your-")) {
        return NextResponse.json(
          { error: "Missing ANTHROPIC_API_KEY in .env.local" },
          { status: 500 }
        );
      }
      const client = new Anthropic({ apiKey });
      try {
        const resolvedModel = model || DEFAULT_AI_MODEL;
        // Vision: Anthropic accepts a content array with image blocks before
        // text. If no images are attached, use the simpler string content
        // form to keep the wire payload small.
        const userContent = visionImages.length > 0
          ? [
              ...visionImages.map((img) => ({
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: img.mediaType as
                    | "image/png"
                    | "image/jpeg"
                    | "image/gif"
                    | "image/webp",
                  data: img.base64,
                },
              })),
              { type: "text" as const, text: prompt },
            ]
          : prompt;
        const stream = client.messages.stream({
          model: resolvedModel,
          max_tokens: Math.min(Math.max(256, requestedMaxTokens), 32000),
          ...(DESIGN_MD_SYSTEM ? { system: DESIGN_MD_SYSTEM } : {}),
          messages: [{ role: "user", content: userContent }],
        });
        let text = "";
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            text += event.delta.text;
          }
        }
        return NextResponse.json({ text, model: resolvedModel });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Anthropic error";
        console.error("Anthropic error:", err);
        return NextResponse.json({ error: `Anthropic API error: ${message}` }, { status: 502 });
      }
    }

    // ── OpenAI fallback (only if an API key is configured) ────────────────
    const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
    if (!openaiKey || openaiKey.startsWith("your-")) {
      return NextResponse.json(
        {
          error:
            "No provider available for model. Configure ANTHROPIC_API_KEY (Claude), DEEPSEEK_API_KEY (DeepSeek), PERPLEXITY_API_KEY (sonar*), or OPENAI_API_KEY in .env.local.",
        },
        { status: 500 }
      );
    }
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      // OpenAI vision uses content arrays with `image_url` parts. The data URL
      // can be embedded directly. Use the structured form only when images
      // are attached so simple text calls stay compact.
      const userContent = visionImages.length > 0
        ? [
            ...visionImages.map((img) => ({
              type: "image_url" as const,
              image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
            })),
            { type: "text" as const, text: prompt },
          ]
        : prompt;
      const res = await client.chat.completions.create({
        model: model || "gpt-4o",
        messages: [{ role: "user", content: userContent }],
        max_tokens: Math.min(Math.max(256, requestedMaxTokens), 16000),
        temperature: 0.7,
      });
      return NextResponse.json({ text: res.choices[0]?.message?.content ?? "", model: model || "gpt-4o" });
    } catch (err) {
      const message = openAIErrorMessage(err);
      console.error("OpenAI error:", err);
      return NextResponse.json({ error: `OpenAI API error: ${message}` }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("Generate error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
