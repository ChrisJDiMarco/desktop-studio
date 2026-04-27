import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export type Config = {
  /**
   * Where the Mac app sends backend requests. Defaults to the local Next.js
   * dev server. Will eventually point at app.thinklet.io for production.
   */
  backendUrl: string;
  /**
   * Default model for generation. Anthropic-style names route to Claude;
   * `gpt-*` to OpenAI; `deepseek-*` to DeepSeek; `sonar*` to Perplexity.
   * Mirrored against /api/generate's branching in apps/web.
   */
  model: string;
  /**
   * Persistent project / brand context prepended to every generation. Mirrors
   * the web's "Brand Prompt" Tools-menu entry (desktop-mode.jsx:14440).
   * Empty string disables the prefix.
   */
  brandPrompt: string;
  /**
   * Web's "Critic Mode" toggle (desktop-mode.jsx:14539) — wraps auto-improve
   * with a design-quality scoring pass. Stored here so the toggle survives
   * restarts; the actual auto-improve loop lands in a later chunk.
   */
  criticMode: boolean;
  /**
   * Web's "Focus Mode" toggle (desktop-mode.jsx:14591). On the Mac the
   * effect is "fullscreen the most recently opened artifact"; for now we
   * only persist the bit, the windowing behavior wires up next.
   */
  focusMode: boolean;
  /**
   * Last N submitted prompts. Web persists this as `thinkletPromptVault`
   * in localStorage; we mirror it in the Mac config file. Newest first.
   */
  promptHistory: string[];
};

const PROMPT_HISTORY_LIMIT = 30;

const DEFAULTS: Config = {
  backendUrl: "http://localhost:3000",
  model: "claude-sonnet-4-6",
  brandPrompt: "",
  criticMode: false,
  focusMode: false,
  promptHistory: [],
};

let cache: Config | null = null;

function configPath() {
  return path.join(app.getPath("userData"), "desktop-studio.config.json");
}

function load(): Config {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(configPath(), "utf8");
    cache = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    cache = { ...DEFAULTS };
  }
  // Defensive — older configs may be missing the newer fields.
  if (!Array.isArray(cache!.promptHistory)) cache!.promptHistory = [];
  if (typeof cache!.brandPrompt !== "string") cache!.brandPrompt = "";
  if (typeof cache!.criticMode !== "boolean") cache!.criticMode = false;
  if (typeof cache!.focusMode !== "boolean") cache!.focusMode = false;
  return cache!;
}

function save(next: Config) {
  cache = next;
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
}

export function getConfig(): Config {
  return { ...load() };
}

export function setConfig(patch: Partial<Config>): Config {
  const next = { ...load(), ...patch };
  // Light validation.
  if (typeof next.backendUrl === "string") {
    next.backendUrl = next.backendUrl.trim().replace(/\/$/, "");
    if (!next.backendUrl) next.backendUrl = DEFAULTS.backendUrl;
  }
  if (typeof next.model === "string" && !next.model.trim()) {
    next.model = DEFAULTS.model;
  }
  if (typeof next.brandPrompt !== "string") next.brandPrompt = "";
  if (!Array.isArray(next.promptHistory)) next.promptHistory = [];
  next.promptHistory = next.promptHistory
    .filter((p): p is string => typeof p === "string" && !!p.trim())
    .slice(0, PROMPT_HISTORY_LIMIT);
  save(next);
  return { ...next };
}

export function getBackendUrl(): string {
  return load().backendUrl.replace(/\/$/, "");
}

export function setBackendUrl(url: string): void {
  setConfig({ backendUrl: url });
}

export function getModel(): string {
  return load().model;
}

export function pushPromptHistory(prompt: string): Config {
  const trimmed = prompt.trim();
  if (!trimmed) return getConfig();
  const current = load();
  // Dedupe — if the same prompt was just submitted, move it to top instead
  // of repeating it.
  const without = current.promptHistory.filter((p) => p !== trimmed);
  const next = [trimmed, ...without].slice(0, PROMPT_HISTORY_LIMIT);
  return setConfig({ promptHistory: next });
}
