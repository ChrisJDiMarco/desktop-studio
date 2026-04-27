import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export type Config = {
  /**
   * Where the Mac app sends backend requests. Defaults to the local Next.js
   * dev server. Will eventually point at app.thinklet.io for production.
   */
  backendUrl: string;
};

const DEFAULTS: Config = {
  backendUrl: "http://localhost:3000",
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

export function getBackendUrl(): string {
  return load().backendUrl.replace(/\/$/, "");
}

export function setBackendUrl(url: string): void {
  save({ ...load(), backendUrl: url });
}
