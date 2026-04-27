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
};

const DEFAULTS: Config = {
  backendUrl: "http://localhost:3000",
  model: "claude-sonnet-4-6",
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
  // Light validation — drop empty strings that would break URLs.
  if (typeof next.backendUrl === "string") {
    next.backendUrl = next.backendUrl.trim().replace(/\/$/, "");
    if (!next.backendUrl) next.backendUrl = DEFAULTS.backendUrl;
  }
  if (typeof next.model === "string" && !next.model.trim()) {
    next.model = DEFAULTS.model;
  }
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
