// Design tokens — single source of truth for both apps/web and apps/mac.
// Keep in sync with the canonical design spec at /DESIGN.md (root of repo).
// On any change here, update DESIGN.md as well so designers and engineers stay aligned.

export const colors = {
  primary: "#0a0a0b",
  surface: "#111827",
  surfaceElevated: "#1f2937",
  surfaceOverlay: "#0f1117",
  accent: "#22d3ee",
  accentDim: "#0e7490",
  accentViolet: "#8b5cf6",
  accentVioletDim: "#5b21b6",
  neutral: "#9ca3af",
  border: "#1e2538",
  borderStrong: "#2a3449",
  onPrimary: "#ffffff",
  onSurface: "#ffffff",
  onAccent: "#000000",
  onAccentViolet: "#ffffff",
  success: "#22c55e",
  warning: "#eab308",
  danger: "#ef4444",
  dangerDark: "#b91c1c",
  info: "#3b82f6",
} as const;

export const typography = {
  display: {
    fontFamily: "Geist Sans",
    fontSize: "2.25rem",
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
  },
  h1: {
    fontFamily: "Geist Sans",
    fontSize: "1.75rem",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.015em",
  },
  h2: {
    fontFamily: "Geist Sans",
    fontSize: "1.25rem",
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontFamily: "Geist Sans",
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  bodyMd: {
    fontFamily: "Geist Sans",
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: 1.6,
  },
  bodySm: {
    fontFamily: "Geist Sans",
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: 1.5,
  },
  labelCaps: {
    fontFamily: "Geist Sans",
    fontSize: "0.625rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
  },
  code: {
    fontFamily: "Geist Mono",
    fontSize: "0.8125rem",
    fontWeight: 400,
    lineHeight: 1.6,
  },
} as const;

export const rounded = {
  xs: "4px",
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  full: "9999px",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
} as const;

export const tokens = {
  colors,
  typography,
  rounded,
  spacing,
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof typeof colors;
export type TypographyToken = keyof typeof typography;
export type RoundedToken = keyof typeof rounded;
export type SpacingToken = keyof typeof spacing;
