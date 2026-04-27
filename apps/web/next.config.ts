import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");

// Claude for Desktop injects ANTHROPIC_API_KEY="" (empty) into the shell environment,
// which causes process.env to have the variable set to empty even though .env.local
// has the real key. Since --env-file won't override existing vars, we force-read
// .env.local here and override any empty values before Next.js starts up.
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eqIdx = trimmed.indexOf("=");
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    // Override if .env.local has a real value (even if env already has an empty one)
    if (key && val) process.env[key] = val;
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
