import { NextRequest, NextResponse } from "next/server";

type ArtifactInput = {
  id?: string;
  title?: string;
  type?: string;
  language?: string;
  content?: string;
  mediaUrl?: string | null;
  width?: number;
  height?: number;
};

type ProjectFile = {
  path: string;
  content: string;
};

const MAX_SOURCE_CHARS = 60_000;
const MAX_TOTAL_FILE_CHARS = 900_000;
const APP_GENERATION_TIMEOUT_MS = 75_000;

function slugify(value: string | undefined): string {
  return String(value || "generated-app")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "generated-app";
}

function compactSource(value: unknown): string {
  let text = typeof value === "string" ? value : "";
  text = text.replace(
    /data:[^"'\s)]+;base64,[A-Za-z0-9+/=]+/g,
    (match) => `[data URL omitted: ${match.length} chars]`,
  );
  if (text.length > MAX_SOURCE_CHARS) {
    text = `${text.slice(0, MAX_SOURCE_CHARS)}\n\n[artifact source truncated from ${text.length} chars]`;
  }
  return text;
}

function safePath(raw: unknown): string | null {
  const path = String(raw || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");
  if (!path || path.length > 180) return null;
  if (path.includes("..") || path.includes("//")) return null;
  if (path.endsWith("/")) return null;
  if (path === ".env" || path.startsWith(".env.")) return null;
  if (path.includes("node_modules/") || path.includes(".next/")) return null;
  return path;
}

function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = stripMarkdownFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const json = cleaned.slice(start, end + 1);
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function normalizeFiles(rawFiles: unknown): ProjectFile[] {
  const candidates: Array<{ path?: unknown; content?: unknown }> = [];
  if (Array.isArray(rawFiles)) {
    for (const file of rawFiles) {
      if (file && typeof file === "object") candidates.push(file as { path?: unknown; content?: unknown });
    }
  } else if (rawFiles && typeof rawFiles === "object") {
    for (const [path, content] of Object.entries(rawFiles as Record<string, unknown>)) {
      candidates.push({ path, content });
    }
  }

  const byPath = new Map<string, string>();
  let totalChars = 0;
  for (const file of candidates) {
    const path = safePath(file.path);
    if (!path) continue;
    let content: string;
    if (typeof file.content === "string") {
      content = file.content;
    } else {
      content = JSON.stringify(file.content ?? "", null, 2);
    }
    totalChars += content.length;
    if (totalChars > MAX_TOTAL_FILE_CHARS) break;
    byPath.set(path, content);
    if (byPath.size >= 80) break;
  }
  return Array.from(byPath.entries())
    .map(([path, content]) => ({ path, content }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function upsertFile(files: ProjectFile[], path: string, content: string) {
  const idx = files.findIndex((file) => file.path === path);
  if (idx >= 0) files[idx] = { path, content };
  else files.push({ path, content });
}

function defaultPackageJson(title: string) {
  return JSON.stringify({
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "eslint",
    },
    dependencies: {
      "@tailwindcss/postcss": "^4",
      "class-variance-authority": "^0.7.1",
      "clsx": "^2.1.1",
      "framer-motion": "^12.38.0",
      "lucide-react": "^1.7.0",
      next: "16.2.2",
      react: "19.2.4",
      "react-dom": "19.2.4",
      tailwindcss: "^4",
    },
    devDependencies: {
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      eslint: "^9",
      "eslint-config-next": "16.2.2",
      typescript: "^5",
    },
  }, null, 2).replace("{\n", `{\n  "name": "${slugify(title)}",\n  "version": "0.1.0",\n  "private": true,\n`);
}

function fallbackPreviewHtml(title: string, description: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #101827; color: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, sans-serif; display: grid; place-items: center; }
      main { width: min(760px, calc(100vw - 48px)); padding: 36px; border: 1px solid rgba(148, 163, 184, .25); border-radius: 20px; background: rgba(15, 23, 42, .88); box-shadow: 0 28px 90px rgba(0, 0, 0, .38); }
      h1 { margin: 0 0 12px; font-size: 38px; letter-spacing: -0.03em; }
      p { margin: 0; color: #cbd5e1; line-height: 1.7; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title.replace(/</g, "&lt;")}</h1>
      <p>${description.replace(/</g, "&lt;")}</p>
    </main>
  </body>
</html>`;
}

function fallbackFiles(artifact: ArtifactInput, title: string, description: string): ProjectFile[] {
  const source = compactSource(artifact.content);
  const hasHtml = /<!doctype\s+html|<html[\s>]/i.test(source);
  const srcDoc = hasHtml ? JSON.stringify(source) : JSON.stringify(fallbackPreviewHtml(title, description));
  return [
    { path: "package.json", content: defaultPackageJson(title) },
    {
      path: "app/layout.tsx",
      content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description)},
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    },
    {
      path: "app/page.tsx",
      content: `"use client";

const artifactHtml = ${srcDoc};

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="border-b border-white/10 px-4 py-3">
          <h1 className="text-sm font-semibold">${title.replace(/`/g, "'")}</h1>
        </div>
        <iframe
          title="${title.replace(/"/g, "'")}"
          srcDoc={artifactHtml}
          className="min-h-0 flex-1 border-0 bg-white"
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </main>
  );
}
`,
    },
    {
      path: "app/globals.css",
      content: `@import "tailwindcss";

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
}
`,
    },
    { path: "next.config.ts", content: `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n` },
    { path: "postcss.config.mjs", content: `const config = {\n  plugins: ["@tailwindcss/postcss"],\n};\n\nexport default config;\n` },
    {
      path: "eslint.config.mjs",
      content: `import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
`,
    },
    { path: "next-env.d.ts", content: `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// This file is generated by Next.js and included here so editors recognize Next types immediately.\n` },
    {
      path: "tsconfig.json",
      content: JSON.stringify({
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      }, null, 2),
    },
    { path: "README.md", content: `# ${title}\n\n${description}\n\n## Run locally\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n` },
  ];
}

function normalizeProject(parsed: Record<string, unknown> | null, artifact: ArtifactInput, rawText: string) {
  const title = String(parsed?.title || artifact.title || "Generated App").slice(0, 80);
  const description = String(parsed?.description || `Next.js app generated from ${artifact.title || "a desktop artifact"}.`).slice(0, 400);
  const slug = slugify(String(parsed?.slug || title));
  let files = normalizeFiles(parsed?.files);
  const fallback = fallbackFiles(artifact, title, description);

  if (files.length === 0) {
    files = fallback;
  }

  if (!files.some((file) => file.path === "package.json")) {
    upsertFile(files, "package.json", defaultPackageJson(title));
  }
  if (!files.some((file) => file.path === "app/layout.tsx")) {
    upsertFile(files, "app/layout.tsx", fallback.find((file) => file.path === "app/layout.tsx")!.content);
  }
  if (!files.some((file) => file.path === "app/page.tsx")) {
    upsertFile(files, "app/page.tsx", fallback.find((file) => file.path === "app/page.tsx")!.content);
  }
  if (!files.some((file) => file.path === "app/globals.css")) {
    upsertFile(files, "app/globals.css", fallback.find((file) => file.path === "app/globals.css")!.content);
  }
  for (const requiredPath of ["next.config.ts", "postcss.config.mjs", "eslint.config.mjs", "next-env.d.ts", "tsconfig.json"]) {
    if (!files.some((file) => file.path === requiredPath)) {
      const fallbackFile = fallback.find((file) => file.path === requiredPath);
      if (fallbackFile) upsertFile(files, requiredPath, fallbackFile.content);
    }
  }
  if (!files.some((file) => file.path === "README.md")) {
    upsertFile(files, "README.md", `# ${title}\n\n${description}\n`);
  }

  const previewHtml = typeof parsed?.previewHtml === "string" && parsed.previewHtml.trim()
    ? parsed.previewHtml
    : fallbackPreviewHtml(title, description);

  return {
    title,
    slug,
    description,
    entryPath: String(parsed?.entryPath || parsed?.entry || "app/page.tsx"),
    previewHtml,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    warnings: parsed ? [] : ["Model did not return parseable JSON; generated a safe app shell instead."],
    rawText: rawText.slice(0, 2000),
  };
}

function fallbackProject(artifact: ArtifactInput, reason: string) {
  const project = normalizeProject(null, artifact, reason);
  return {
    ...project,
    fallback: true,
    providerModel: null,
    usage: null,
    warnings: [
      ...project.warnings,
      reason,
    ],
  };
}

function buildPrompt(artifact: ArtifactInput) {
  const title = artifact.title || "Desktop Artifact";
  const source = compactSource(artifact.content);
  const mediaHint =
    typeof artifact.mediaUrl === "string" && artifact.mediaUrl && !artifact.mediaUrl.startsWith("data:")
      ? `\nMEDIA_URL: ${artifact.mediaUrl}`
      : "";

  return `You are an expert AI app maker. Convert the desktop artifact below into a complete, deployable Next.js App Router application.

Return ONLY strict JSON. No markdown fences, no commentary.

JSON shape:
{
  "title": "Short app title",
  "slug": "kebab-case-folder-name",
  "description": "One sentence",
  "entryPath": "app/page.tsx",
  "previewHtml": "<!DOCTYPE html>...self-contained preview of the finished app...</html>",
  "files": [
    { "path": "package.json", "content": "..." },
    { "path": "app/layout.tsx", "content": "..." },
    { "path": "app/page.tsx", "content": "..." }
  ]
}

Requirements:
- Build a real Next.js 16 + React 19 app using the app directory.
- Include package.json, app/layout.tsx, app/page.tsx, app/globals.css, next.config.ts, postcss.config.mjs, eslint.config.mjs, next-env.d.ts, tsconfig.json, README.md, and any useful components under components/.
- Use TypeScript/TSX where appropriate.
- Make app/page.tsx run as a normal browser app. Use "use client" if it uses hooks, events, localStorage, charts, animation, or browser APIs.
- Preserve and expand the artifact's visual style and functionality. Do not just embed a screenshot.
- Use realistic sample data and complete interaction states.
- Include only dependencies listed in package.json.
- Keep generated file count under 24 files and total output concise enough to fit in one response.
- previewHtml must be a self-contained browser preview of the finished app. It can be an approximation, but it must look like the app and run without Next.
- Do not include .env files, node_modules, .next, binary files, lockfiles, or remote package install logs.

Artifact metadata:
${JSON.stringify({
    title,
    type: artifact.type || "html",
    language: artifact.language || "html",
    width: artifact.width,
    height: artifact.height,
  }, null, 2)}${mediaHint}

Artifact source:
${source}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const artifact = (body?.artifact && typeof body.artifact === "object" ? body.artifact : {}) as ArtifactInput;
    if (!artifact.title && !artifact.content && !artifact.mediaUrl) {
      return NextResponse.json({ error: "artifact is required" }, { status: 400 });
    }
    if (body?.forceFallback === true) {
      return NextResponse.json(fallbackProject(artifact, "Forced fallback route check generated a safe Next.js app shell from the artifact."));
    }

    const origin = new URL(request.url).origin;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), APP_GENERATION_TIMEOUT_MS);
    let generateRes: Response;
    try {
      generateRes = await fetch(`${origin}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(artifact),
          model: typeof body?.model === "string" ? body.model : undefined,
          max_tokens: 18000,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      const message = err instanceof Error && err.name === "AbortError"
        ? "The app-maker AI took too long, so Desktop Studio generated a safe Next.js app shell from the artifact."
        : `The app-maker AI request failed (${err instanceof Error ? err.message : "fetch failed"}), so Desktop Studio generated a safe Next.js app shell from the artifact.`;
      return NextResponse.json(fallbackProject(artifact, message));
    } finally {
      clearTimeout(timeout);
    }

    if (!generateRes.ok) {
      const err = await generateRes.json().catch(() => ({}));
      const message = err.error || `The app-maker AI returned HTTP ${generateRes.status}, so Desktop Studio generated a safe Next.js app shell from the artifact.`;
      return NextResponse.json(fallbackProject(artifact, message));
    }

    const generated = await generateRes.json().catch(() => null);
    const text = typeof generated?.text === "string" ? generated.text : String(generated || "");
    const parsed = extractJsonObject(text);
    if (!parsed && !text.trim()) {
      return NextResponse.json(fallbackProject(artifact, "The app-maker AI returned an empty response, so Desktop Studio generated a safe Next.js app shell from the artifact."));
    }
    const project = normalizeProject(parsed, artifact, text);

    return NextResponse.json({
      ...project,
      providerModel: generated?.model || null,
      usage: generated?.usage || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "App generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
