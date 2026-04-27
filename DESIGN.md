---
version: alpha
name: Desktop Studio
description: A dark-mode AI creative workspace where users compose, preview, and arrange living artifacts on an infinite canvas.
colors:
  primary: "#0a0a0b"
  surface: "#111827"
  surface-elevated: "#1f2937"
  surface-overlay: "#0f1117"
  accent: "#22d3ee"
  accent-dim: "#0e7490"
  accent-violet: "#8b5cf6"
  accent-violet-dim: "#5b21b6"
  neutral: "#9ca3af"
  border: "#1e2538"
  border-strong: "#2a3449"
  on-primary: "#ffffff"
  on-surface: "#ffffff"
  on-accent: "#000000"
  on-accent-violet: "#ffffff"
  success: "#22c55e"
  warning: "#eab308"
  danger: "#ef4444"
  danger-dark: "#b91c1c"
  info: "#3b82f6"
typography:
  display:
    fontFamily: Geist Sans
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  h1:
    fontFamily: Geist Sans
    fontSize: 1.75rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.015em
  h2:
    fontFamily: Geist Sans
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.3
  h3:
    fontFamily: Geist Sans
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: Geist Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Geist Sans
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: Geist Sans
    fontSize: 0.625rem
    fontWeight: 700
    letterSpacing: 0.1em
  code:
    fontFamily: Geist Mono
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    typography: "{typography.body-sm}"
  button-primary-hover:
    backgroundColor: "{colors.accent-dim}"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    typography: "{typography.body-sm}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: 6px 12px
    typography: "{typography.body-sm}"
  button-destructive:
    backgroundColor: "{colors.danger-dark}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  artifact-window:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  artifact-titlebar:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    typography: "{typography.label-caps}"
    height: 32px
  input:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    typography: "{typography.body-sm}"
  badge:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.full}"
    padding: 2px 8px
    typography: "{typography.label-caps}"
  badge-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  dropdown:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
  canvas:
    backgroundColor: "{colors.primary}"
  dialog-overlay:
    backgroundColor: "{colors.surface-overlay}"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  ai-indicator:
    backgroundColor: "{colors.accent-violet}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    size: 8px
  ai-indicator-active:
    backgroundColor: "{colors.accent-violet-dim}"
    textColor: "{colors.on-accent-violet}"
    rounded: "{rounded.full}"
    size: 8px
---

## Overview

Desktop Studio is a **dark, glassmorphic AI workspace** — a desktop OS for living artifacts. The aesthetic is cinematic minimalism: deep near-black backgrounds, translucent layered surfaces, and a single neon cyan interaction color that signals "this is alive." The UI should feel like a pro creative tool (Figma, After Effects) that happens to live in a browser.

The canvas is infinite darkness. Artifact windows float on it like lit panels in a dark room. Every surface is slightly translucent with a sharp blur, giving depth without noise. The design rewards focus: less chrome, more content.

## Colors

The palette is built on two neutrals and one accent. Color is used as signal, not decoration.

- **Primary (#0a0a0b):** The canvas. Near-void black — not pure black, just dark enough to absorb. Everything else floats above it.
- **Surface (#111827):** Artifact windows, panels, modals. Slightly elevated from the void.
- **Surface Elevated (#1f2937):** Hovered rows, active states, dropdowns, nested panels.
- **Accent (#22d3ee):** Cyan — the sole "live" color. Used for interactive affordances, AI generation spinners, CRISPR mode highlights, and primary CTAs. When something is cyan, it means the system is active or actionable.
- **Accent Violet (#8b5cf6):** Reserved for AI magic moments — Auto-Improve, streaming generation, model intelligence. Never use for navigation.
- **Neutral (#9ca3af):** Captions, metadata, placeholder text, secondary icons.
- **Border (#ffffff1a / #ffffff26):** Subtle glass edges. Never use solid colors for borders — white with low opacity reads as frosted glass.
- **Success / Warning / Danger / Info:** Semantic only. Never decorative. Always paired with an icon.

## Typography

Two faces: **Geist Sans** for all UI copy, **Geist Mono** for code, IDs, and technical labels.

Type scale is tight — this is a dense tool, not a marketing page. Labels are uppercase with wide tracking. Body is 14px. Nothing is larger than 36px except generated artifact content.

- **Display:** Reserved for onboarding splash or empty-state hero moments only.
- **h1 / h2 / h3:** Panel headers. Use sparingly — most UI is label-caps or body-sm.
- **body-md (14px):** Default copy, prompts, descriptions.
- **body-sm (12px):** Most interactive elements — buttons, list items, dropdown options.
- **label-caps (10px, uppercase, tracked):** Section headers, badge text, titlebar labels, all-caps metadata.
- **code (Geist Mono 13px):** Generated code previews, IDs, shortcut keys.

## Layout

The desktop is a free-form canvas. Artifact windows can be placed anywhere.

- Minimum artifact width: 280px
- Default artifact size: 480×360px
- Minimum gap between artifacts: 16px (spacing.lg)
- Titlebar height: 32px (fixed)
- Header bar height: 44px (fixed)
- Sidebar / panel width: 320px (when open)

All layout is relative to the viewport. Artifacts use `position: fixed` with explicit coordinates. There is no grid — this is a freeform space.

## Elevation & Depth

Depth is expressed through opacity, blur, and shadow — never solid background color steps alone.

| Layer | Treatment |
|:------|:----------|
| Canvas | `bg-[#0a0a0b]` — the void |
| Artifact window | `bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/40` |
| Titlebar | `bg-white/5 border-b border-white/10` |
| Dropdown / popover | `bg-gray-900/98 backdrop-blur-xl shadow-2xl border border-white/15` |
| Modal overlay | `bg-black/60 backdrop-blur-sm` |
| Tooltip | `bg-gray-900/95 border border-white/10 shadow-lg` |

Shadows use `shadow-black/40` — black at 40% opacity. No colored shadows.

## Shapes

Corner radius follows a strict scale. Never use arbitrary values.

- **xs (4px):** Traffic-light dots, tiny chips
- **sm (6px):** Icon buttons, small badges, code tokens
- **md (10px):** Buttons, inputs, dropdown items
- **lg (14px):** Tooltips, popovers, small cards
- **xl (20px):** Artifact windows, modals, large panels
- **full (9999px):** Tags, status pills, avatar rings

## Components

### Artifact Window
The primary unit of the desktop. A floating panel with:
- `bg-gray-900/95 backdrop-blur-xl` surface
- `rounded-xl border border-white/15` chrome
- `shadow-2xl shadow-black/40` depth
- Macintosh-style traffic-light controls (red/yellow/green) in the titlebar

### Titlebar
- Height: 32px, `bg-white/5 border-b border-white/10`
- Left: traffic lights (12px circles, 8px gap)
- Center: artifact name in `label-caps` at `text-white/60`
- Right: action icons at `text-white/40`, hover → `text-white/80`

### Buttons
- **Primary:** Solid cyan fill, black text, `rounded-md`. Only one per panel.
- **Secondary:** Dark surface fill, white text. Peers of primary.
- **Ghost:** Transparent, neutral text. For icon-adjacent actions.
- **Destructive:** Red fill, white text. Confirm before executing.

### Input / Prompt Bar
- `bg-white/10 border border-white/15 rounded-lg`
- Focus state: `border-cyan-400/60` — cyan ring signals AI readiness
- Placeholder: `text-white/25`

### Badge / Tag
- Uppercase, tracked, 10px — always `label-caps`
- Default: `bg-white/10 text-white/70`
- Accent: `bg-cyan-500/20 text-cyan-300 border border-cyan-400/40`
- Status colors follow semantic palette

### Resize Handle
- Bottom-right corner: `border-b-2 border-r-2 border-white/30`
- Hover: transitions to `border-cyan-400`

## Do's and Don'ts

**Do:**
- Use cyan exclusively for interactive / AI-active states
- Layer surfaces with `backdrop-blur` and `bg-*/opacity` — never opaque flat fills
- Keep borders at `border-white/10` to `border-white/20` — glass, not frames
- Use `label-caps` for all section/group headers in the UI chrome
- Let content breathe — artifact windows have their own internal design systems

**Don't:**
- Use colored text for decoration — color on text = semantic signal only
- Mix accent colors arbitrarily — violet is AI magic, cyan is action, never swap
- Add drop shadows to elements already inside an artifact window (double-shadowing)
- Use `rounded-none` or no border-radius — every surface is softly rounded
- Create solid-color panels without translucency — everything should imply depth
