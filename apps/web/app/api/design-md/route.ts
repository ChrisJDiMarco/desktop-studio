import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type TokenObject = Record<string, unknown>;
type StringTokenObject = Record<string, string>;

/** Parse DESIGN.md YAML front matter into the ds object format used by the app. */
function parseDesignMd(): Record<string, unknown> | null {
  try {
    const src = fs.readFileSync(path.join(process.cwd(), "DESIGN.md"), "utf8");
    const fmMatch = src.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;

    // Minimal YAML key:value parser (handles nested keys via indentation)
    const yaml = fmMatch[1];
    const tokens = parseYamlTokens(yaml);

    const colors = asStringRecord(tokens.colors);
    const typography = asTokenObject(tokens.typography);
    const spacing = asStringRecord(tokens.spacing);
    const components = asTokenObject(tokens.components);
    const name = tokens.name ?? "Desktop Studio";
    const description = tokens.description ?? "";

    // Extract only the Don'ts items from Do's and Don'ts section
    const dosAndDontsMatch = src.match(/## Do's and Don'ts([\s\S]*?)(?:\n## |$)/);
    const dosAndDontsBody = dosAndDontsMatch?.[1] ?? "";
    const dontsSection = dosAndDontsBody.split("**Don't:**")[1] ?? "";
    const avoid = dontsSection
      .split("\n")
      .filter(l => l.trimStart().startsWith("- "))
      .map(l => l.replace(/^[\s-]+/, "").trim())
      .filter(Boolean);

    // Extract overview prose
    const overviewMatch = src.match(/## Overview\n([\s\S]*?)(?:\n## )/);
    const overview = overviewMatch?.[1]?.trim() ?? "";

    // Map DESIGN.md color tokens → ds palette
    const palette: Record<string, string | { name: string; hex: string }[]> = {};
    if (colors.primary)         palette.background = colors.primary;
    if (colors["on-primary"])   palette.foreground = colors["on-primary"];
    if (colors.surface)         palette.secondary  = colors.surface;
    if (colors.accent)          palette.accent     = colors.accent;
    if (colors["on-accent"])    palette.primary    = colors.accent; // CTA
    if (colors.neutral)         palette.muted      = colors.neutral;

    const extras: { name: string; hex: string }[] = [];
    for (const [k, v] of Object.entries(colors)) {
      if (!["primary","surface","surface-elevated","surface-overlay","accent","accent-dim",
            "neutral","on-primary","on-surface","on-accent","border","border-strong"].includes(k)
          && typeof v === "string" && v.startsWith("#")) {
        extras.push({ name: k, hex: v });
      }
    }
    if (extras.length) palette.extras = extras;

    // Map typography tokens
    const bodyTypo = asStringRecord(typography["body-md"]);
    const headTypo = asStringRecord(typography.h1 ?? typography.display);
    const codeTypo = asStringRecord(typography.code);

    const typo = {
      headingFont: headTypo.fontFamily ?? "Geist Sans",
      bodyFont:    bodyTypo.fontFamily ?? "Geist Sans",
      monoFont:    codeTypo.fontFamily ?? "Geist Mono",
      scale:       ["10px","12px","14px","16px","20px","28px","36px"],
      weights:     ["400","600","700"],
    };

    // Map spacing tokens
    const spacingScale = Object.values(spacing).filter(v => typeof v === "string");
    const sp = { base: 4, scale: spacingScale.length ? spacingScale : ["4px","8px","12px","16px","24px","32px","48px"] };

    // Map component tokens → one-line descriptions
    const compDescs: Record<string, string> = {};
    for (const [cName, cTokens] of Object.entries(components)) {
      if (typeof cTokens !== "object" || !cTokens) continue;
      const parts = Object.entries(cTokens as Record<string, string>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      compDescs[cName] = parts;
    }

    return {
      id: "design-md-builtin",
      name,
      description: description || overview.substring(0, 200),
      palette,
      typography: typo,
      spacing: sp,
      components: compDescs,
      tone: {
        voice: "terse",
        personality: "Dark, cinematic, professional. Glassmorphic surfaces, neon cyan interaction.",
      },
      avoid: avoid.length ? avoid : [
        "gray-100 bg + white cards (shadcn default look)",
        "system-ui as only font — always load a real display font from Google Fonts",
        "generic purple gradients as decoration",
        "emoji-prefixed headings",
        "lorem ipsum or placeholder text",
        "every button the same pill shape and accent color",
      ],
      notes: `Design tokens from DESIGN.md. Primary canvas: ${colors.primary ?? "#0a0a0b"}. Accent: ${colors.accent ?? "#22d3ee"} (cyan). AI magic: ${colors["accent-violet"] ?? "#8b5cf6"} (violet). Font: Geist Sans / Geist Mono.`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltIn: true,
    };
  } catch {
    return null;
  }
}

/** Minimal YAML parser — handles `key: value` and one level of nesting. */
function parseYamlTokens(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentObj: Record<string, unknown> | null = null;
  let currentDepth = 0;
  let subKey: string | null = null;
  let subObj: Record<string, unknown> | null = null;

  for (const line of yaml.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    const stripped = line.trim();
    const colonIdx = stripped.indexOf(":");

    if (colonIdx === -1) continue;
    const key = stripped.slice(0, colonIdx).trim();
    const val = stripped.slice(colonIdx + 1).trim();

    if (indent === 0) {
      // Top-level key
      if (val) {
        result[key] = unquote(val);
        currentKey = null; currentObj = null;
        subKey = null; subObj = null;
      } else {
        // Start of nested object
        currentKey = key;
        currentObj = {};
        result[key] = currentObj;
        currentDepth = 0;
        subKey = null; subObj = null;
      }
    } else if (indent === 2 && currentObj !== null) {
      if (val) {
        currentObj[key] = unquote(val);
        subKey = null; subObj = null;
      } else {
        // Start of sub-nested object (e.g. typography.h1)
        subKey = key;
        subObj = {};
        currentObj[key] = subObj;
      }
    } else if (indent >= 4 && subObj !== null) {
      if (val) subObj[key] = unquote(val);
    }
  }

  return result;
}

function unquote(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

function asTokenObject(value: unknown): TokenObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as TokenObject
    : {};
}

function asStringRecord(value: unknown): StringTokenObject {
  const source = asTokenObject(value);
  return Object.fromEntries(
    Object.entries(source).filter(([, v]) => typeof v === "string")
  ) as StringTokenObject;
}

export async function GET() {
  const ds = parseDesignMd();
  if (!ds) {
    return NextResponse.json({ error: "DESIGN.md not found or invalid" }, { status: 404 });
  }
  return NextResponse.json(ds);
}
