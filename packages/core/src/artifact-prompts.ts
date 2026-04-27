/**
 * Artifact prompt builders.
 *
 * Ported VERBATIM from apps/web/components/desktop-mode.jsx (lines 9852–10442)
 * so apps/mac generates HTML artifacts at the same quality bar as the web's
 * Desktop Studio. Both apps will eventually call these directly; the web's
 * inline copy in desktop-mode.jsx is the duplicate, and unifying it is the
 * tail end of Chunk C.
 *
 * Strings inside type guides and the master prompt are intentionally
 * faithful to the web source — keep this file in sync when desktop-mode.jsx
 * iterates on prompts. Search desktop-mode.jsx for "htmlTypeInfo" to find
 * the canonical block.
 */

export type HtmlArtifactKind =
  | "iOS App"
  | "Android App"
  | "Landing Page"
  | "Dashboard"
  | "Game"
  | "Email Template"
  | "Slides"
  | "Chat App"
  | "E-Commerce"
  | "Portfolio"
  | "Social Card"
  | "Document"
  | "App / Tool / Widget";

export type HtmlArtifactDims = { w: number; h: number };

export type HtmlArtifactType = {
  kind: HtmlArtifactKind;
  dims: HtmlArtifactDims;
};

export function detectHtmlArtifactType(userPrompt: string): HtmlArtifactType {
  const p = userPrompt.toLowerCase();
  const isIOS = /\b(iphone|ios app|ios design|mobile app|ipad|swift ui)\b/.test(p);
  const isAndroid = /\bandroid\b/.test(p) && !isIOS;
  const isLanding =
    /\b(landing page|hero section|marketing page|waitlist page|coming soon page|product page|saas landing)\b/.test(
      p
    );
  const isDash =
    /\b(dashboard|analytics|admin panel|admin dashboard|metrics|data visualization|crm|kpi|stats page)\b/.test(
      p
    );
  const isGame =
    /\b(game|snake game|tetris|chess|puzzle|arcade|platformer|clicker|word game|quiz game)\b/.test(
      p
    );
  const isEmail =
    /\b(email template|newsletter|email design|html email)\b/.test(p);
  const isSlide =
    /\b(presentation|slide deck|slideshow|pitch deck|slides)\b/.test(p);
  const isChat =
    /\b(chat app|messaging app|messenger|chat ui|chat interface)\b/.test(p);
  const isEcomm =
    /\b(e-commerce|ecommerce|online store|product listing|shop page|checkout)\b/.test(
      p
    );
  const isPortfolio =
    /\b(portfolio|personal site|resume site|personal website)\b/.test(p);
  const isSocial =
    /\b(instagram post|social media post|tweet|social card|og image|profile card)\b/.test(
      p
    );
  const isDoc =
    /\b(document|note|readme|markdown|report|article|blog post)\b/.test(p);

  if (isIOS) return { dims: { w: 393, h: 852 }, kind: "iOS App" };
  if (isAndroid) return { dims: { w: 393, h: 852 }, kind: "Android App" };
  if (isLanding) return { dims: { w: 1280, h: 860 }, kind: "Landing Page" };
  if (isDash) return { dims: { w: 1280, h: 800 }, kind: "Dashboard" };
  if (isGame) return { dims: { w: 560, h: 560 }, kind: "Game" };
  if (isEmail) return { dims: { w: 640, h: 700 }, kind: "Email Template" };
  if (isSlide) return { dims: { w: 1280, h: 720 }, kind: "Slides" };
  if (isChat) return { dims: { w: 420, h: 700 }, kind: "Chat App" };
  if (isEcomm) return { dims: { w: 1280, h: 860 }, kind: "E-Commerce" };
  if (isPortfolio) return { dims: { w: 1280, h: 860 }, kind: "Portfolio" };
  if (isSocial) return { dims: { w: 500, h: 500 }, kind: "Social Card" };
  if (isDoc) return { dims: { w: 760, h: 900 }, kind: "Document" };
  return { dims: { w: 560, h: 440 }, kind: "App / Tool / Widget" };
}

export const HTML_TYPE_GUIDES: Record<HtmlArtifactKind, string> = {
  "iOS App": `
TYPE: iPhone iOS App
DESIGN SYSTEM — follow these rules exactly:
- 🚫 NEVER render a fake status bar, fake signal bars, fake time/clock, fake battery icon, or any phone-shell chrome. The app viewport IS the phone screen — no decorative device wrapper.
- Root layout: html, body, and your root container all use width:100%; height:100vh; overflow:hidden; margin:0; padding:0. The app must fill 100% of whatever size the window is — no fixed pixel dimensions on the root.
- Internal scroll: the CONTENT AREA between the nav bar and tab bar should be overflow-y:auto (not the body). Use flex:1; overflow-y:auto on the scroll container, flex-direction:column on the root so it fills height perfectly.
- Font: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif
- Navigation bar: 44px height, centered title 17px/600, back/action buttons in #007AFF, subtle border-bottom or backdrop blur
- Tab bar (if present): fixed bottom:0; width:100%; height:49px; background matches theme; up to 5 tabs with 25px icon + 10px label; use padding-bottom:env(safe-area-inset-bottom,0px)
- Colors: #007AFF (blue), #FF3B30 (red), #34C759 (green), #FF9500 (orange), #AF52DE (purple)
- Backgrounds: #F2F2F7 system bg (light) OR #000000 body with #1C1C1E cards (dark) — pick whichever fits the concept
- List cells: 44px min-height, 16px horizontal padding, hairline separator (rgba(60,60,67,0.29))
- Cards/sheets: border-radius 13px, subtle shadow (0 1px 3px rgba(0,0,0,0.12))
- Buttons: pill primary (height:50px; border-radius:25px) OR text button in #007AFF
- Inputs: 44px height, border-radius:10px, #F2F2F7 bg, 16px padding
- Typography: Title 34px/700, Headline 17px/600, Body 17px/400, Caption 12px/400
- Animations: all transitions 0.3s cubic-bezier(0.4,0,0.2,1)
- Make it INDISTINGUISHABLE from a real iOS native app — lush, polished, pixel-perfect`,

  "Android App": `
TYPE: Android Material Design 3 App
DESIGN SYSTEM:
- 🚫 NEVER render a fake status bar, signal icons, time/clock, battery, or any phone-shell chrome. No device wrapper.
- Root layout: html, body, root container all use width:100%; height:100vh; overflow:hidden; margin:0; padding:0. Fill 100% of the window at any size — no fixed pixel dimensions on root.
- Content area between top bar and bottom nav: flex:1; overflow-y:auto
- Font: "Google Sans", Roboto, sans-serif
- Color system: Material You — primary #6750A4, on-primary #FFFFFF, surface #FFFBFE, surface-variant #E7E0EC
- Elevation: box-shadow 1dp=0 1px 2px rgba(0,0,0,0.3), 2dp=0 2px 4px rgba(0,0,0,0.2)
- FAB: 56px circle, primary color, fixed bottom-right 16px margin
- Top app bar: 64px height, title left-aligned 22px/medium
- Cards: border-radius 12px, surface color
- Buttons: Filled (rounded-full, primary bg), Outlined (border primary), Text (primary color only)
- Inputs: outlined style with floating label, border-radius 4px top + 0 bottom
- Bottom nav: 80px height, 3-5 items, icon + label`,

  "Landing Page": `
TYPE: Marketing Landing Page — agency-tier, conversion-optimized
SECTIONS (in order, all implemented): Hero → Logo Strip → Features (3-col cards) → How It Works (numbered steps) → Testimonials → Pricing (3 tiers) → Final CTA → Footer
HERO: min-height:100vh, centered content. H1: 64-80px, font-weight:900, letter-spacing:-0.03em. Subheadline: 20-22px, 60% opacity. 2 CTAs side-by-side: primary (filled pill, 56px, gradient) + secondary (ghost, same height). Background: either a rich mesh gradient (conic-gradient layered), animated CSS gradient, or dark bg with abstract SVG shapes.
VISUAL DETAILS:
- Import Inter or Plus Jakarta Sans from Google Fonts — never system-ui for landing pages
- Logo strip: 6-8 company names in a horizontally scrolling ticker (CSS animation: marquee)
- Feature cards: icon in a 48×48 rounded-xl colored bubble, bold title, 2-line description, subtle border on hover
- How It Works: large step numbers (80px, very low opacity) behind step title; connected by a dashed vertical line
- Testimonials: photo-style avatar (CSS circle with initials + gradient bg), name, role, company, ★★★★★, quote in quotes
- Pricing: 3 columns, middle card elevated (scale(1.04)), "Most Popular" badge, feature checklist with ✓ icons, CTA button
- Footer: logo, 4 nav columns, social icons (SVG), copyright, legal links
ANIMATIONS (all via IntersectionObserver + CSS transitions, NO JavaScript animation libraries):
- Sections fade up: opacity 0→1, translateY 24px→0, transition 0.6s ease, staggered 0.1s per child
- Hero: subtle parallax on scroll (transform:translateY on bg element via scroll event)
- Logo ticker: CSS @keyframes marquee { to { transform:translateX(-50%) } } infinite linear
- CTA button: background-size animation on hover (gradient shift), box-shadow deepening
QUALITY BAR: Looks like it cost $80k and actually converts — specific product name, real benefit copy, plausible social proof numbers ("14,000+ teams", "99.97% uptime", "4.9★ on G2")`,

  "Dashboard": `
TYPE: Analytics Dashboard / Admin Panel — SaaS product quality
LAYOUT: root display:flex; height:100vh; overflow:hidden. Sidebar: 240px fixed, flex-col. Main: flex:1, flex-col, overflow:hidden. Header: 64px. Content: flex:1, overflow-y:auto, padding:24px.
SIDEBAR: dark bg (#0F172A or #111827), company logo + wordmark top, nav items with lucide SVG icons (16px) + label, active item: left border 3px brand color + bg rgba(brand,0.1), section dividers with tiny uppercase labels (ANALYTICS, SETTINGS), bottom: user avatar + name + role
HEADER: lighter dark (#1E293B or #18212F), left: page title (20px semibold) + breadcrumb, center: search bar (rounded-full, 320px, icon inside), right: notifications bell with badge count, user avatar circle with dropdown
KPI CARDS (4-col grid, gap:16px):
- Each: bg card color, border 1px subtle, border-radius:12px, padding:20px
- Icon in colored 40px rounded-lg (brand/success/warning/danger tint bg + icon same color)
- Metric: 36px font-bold, color white/near-white. Label: 12px uppercase tracking-wider, muted color
- Trend badge: ▲ or ▼ + percentage, green or red bg, rounded-full, 12px
- Sparkline: tiny 80×32px SVG line chart (6-8 data points, stroke in brand color, no axes)
CHARTS (draw with REAL SVG math — no placeholder boxes):
- Line chart: SVG polyline or path with computed points from a data array; gradient fill below line (linearGradient, 30% opacity); dot markers on each point; hover tooltip (absolute div)
- Bar chart: flex container, bars are divs with percentage height, gap between, hover darkens
- Donut chart: SVG circles with stroke-dasharray computed from percentage; center label shows total
- Legend: colored dot + label + value, horizontal flex
TABLE: rounded-xl, overflow:hidden card wrapper. Header: 12px uppercase, muted, sortable (↕ icon). Rows: 48px height, hover bg shift, alternate rows (very subtle). Cells: avatar circle (initials + gradient) + name, status badge (rounded-full pill, 3 colors), numeric right-aligned. Actions: "..." icon button revealing a micro-dropdown
COLORS: success #10B981, warning #F59E0B, danger #EF4444, info #3B82F6, purple #8B5CF6
DATA: real-looking — specific user names, product names, dollar amounts, dates, percentages with variance`,

  "Game": `
TYPE: Interactive Browser Game — fully playable, immediately fun
SCREENS (all implemented via JS state machine): START (title + hi-score + animated Play button) → PLAYING → PAUSED (overlay) → GAME OVER (score + hi-score + restart)
GAME LOOP: requestAnimationFrame only — never setInterval for the game tick. Track lastTime to compute delta, cap delta at 50ms to prevent spiral-of-death on tab switch.
CONTROLS: keyboard (keydown/keyup listeners on window) + mouse/touch click as alternative — never block on one input method
HUD: fixed top bar — score (large bold, ticking up with animation), lives (icon × count), level/wave. Use CSS transitions so score number smoothly pops on increment.
SOUND (Web Audio API — no external files):
  const ctx = new (AudioContext || webkitAudioContext)();
  function beep(freq, dur, type='square') { const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(0.3,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+dur); }
  Sounds: action (high beep), score (ascending arp), game-over (descending glide), level-up (fanfare)
VISUAL POLISH:
- CSS @keyframes for: score pop (scale 1.4→1), hit flash (bg color), particle burst (radial translate + fade)
- Dark atmospheric bg with subtle gradient or scanline texture
- Styled start screen: gradient title text, pulsing CTA button (box-shadow animation)
- Game-over screen: score animates counting up, new hi-score triggers a celebration (color flash)
DIFFICULTY: speed/complexity scales — increase every N points or every new level
MUST be fully playable from frame 1 — real collision detection, win/lose conditions, restart without reload`,

  "Email Template": `
TYPE: HTML Email Template
DESIGN SYSTEM:
- 600px centered table-based layout (email-safe)
- ALL styles inline (no <style> block — email clients strip them)
- Use only web-safe fonts (Arial, Georgia, Verdana) OR system-ui
- Background: light neutral (#F9FAFB outer, #FFFFFF inner)
- Header: brand color block with logo/title centered in white
- Body: 24-32px padding, 16px body text, 24px line-height
- CTA button: table-cell button (border-radius 6px, padding 14px 28px, brand color)
- Footer: 12px gray text, unsubscribe link, address
- Looks pixel-perfect in Gmail, Outlook, Apple Mail`,

  "Slides": `
TYPE: Presentation Slides
DESIGN SYSTEM:
- 16:9 aspect ratio (1280×720), slide-by-slide layout
- Navigation: arrow buttons or keyboard left/right to advance slides
- Each slide fills full viewport, no overflow
- Slide types: Title slide, Content slide (bullet points), Two-column, Image + text, Big stat, Quote
- Clean minimal design: 1-2 brand colors, lots of white space
- Large typography: titles 48-64px, body 24-28px, labels 16px
- Slide counter (1/N) bottom right
- Build at least 5-8 meaningful slides for the topic`,

  "Chat App": `
TYPE: Chat / Messaging App UI
DESIGN SYSTEM:
- Fixed viewport, no outer scroll
- Header: 64px, contact name + avatar + status dot (online/away), call/video icons
- Message list: flex-col, scrollable, padding 16px, alternating left (received) / right (sent) bubbles
- Sent bubbles: right-aligned, brand color background, white text, border-radius 18px 18px 4px 18px
- Received bubbles: left-aligned, #F1F1F1 bg, dark text, border-radius 18px 18px 18px 4px
- Timestamps: 11px gray, centered between message groups
- Input bar: fixed bottom, 56px height, rounded-full input, send button
- Show 8-12 realistic pre-populated messages in a conversation`,

  "E-Commerce": `
TYPE: E-Commerce / Online Store
DESIGN SYSTEM:
- Full-width layout, clean white background
- Navigation: logo left, categories center, cart icon + count badge right
- Product grid: 3-4 columns, product card with image placeholder (stylized SVG), title, price, rating stars, "Add to Cart" button
- Product hover: subtle shadow elevation + "Quick View" overlay
- Filters sidebar (left) or filter bar (top): category, price range, sort
- Typography: clean sans-serif, product titles 16px/600, prices 18px/700 in brand color
- Cart indicator: animated count badge
- Make it look like a premium Shopify/Webflow store`,

  "Portfolio": `
TYPE: Personal Portfolio / Resume Site
DESIGN SYSTEM:
- Single-page with smooth scroll sections: Hero → About → Work/Projects → Skills → Contact
- Hero: Full viewport, name large (60-80px bold), role/tagline, subtle animated background (CSS gradient animation or particle-like dots)
- Work grid: 2-3 column project cards, each with preview image (stylized placeholder), project name, tags (React, Node, etc.), hover overlay with links
- Skills: icon grid or horizontal tag cloud
- Contact: simple form + social links
- Elegant micro-animations: fade-up on scroll, cursor effects, smooth transitions
- Either minimalist (white + one accent) OR dramatic dark theme`,

  "Social Card": `
TYPE: Social Media Card / Post
DESIGN SYSTEM:
- Exact 500×500 square (or 1200×630 for OG/Twitter card)
- Bold visual hierarchy: headline takes up most of the space
- Strong background: gradient, solid bold color, or dark with imagery
- Minimal text: headline + 1 subline + optional logo/handle
- High visual impact — looks great as an actual post`,

  "Document": `
TYPE: Document / Note / Article
DESIGN SYSTEM:
- Clean reading layout, max-width 720px centered, white background
- Typography: Georgia or "Merriweather" via CDN for body, system-ui for UI chrome
- Generous line-height (1.7), 18px body text
- H1 32px/700, H2 24px/600, H3 20px/500
- Code blocks: monospace, #F6F8FA background, 4px border-left accent
- Blockquotes: left border 4px brand color, italic, indented
- Table of contents sidebar or inline for long docs`,

  "App / Tool / Widget": `
TYPE: Desktop App / Tool / Widget — choose the most compelling aesthetic for this use case and execute it PERFECTLY:
  (a) Minimal dark: #0A0A0A body, #141414 cards, one vivid accent (violet/cyan/emerald), Inter font
  (b) Clean light: #F8FAFC body, white cards with 1px border (#E2E8F0), accent color, Inter font
  (c) Glassmorphism: frosted panels (backdrop-filter:blur(20px); background:rgba(255,255,255,0.07)) over gradient bg
  (d) Brutalist: bold type, 2px solid borders, no shadows, raw grid — for dev tools / code / data
- Import a real Google Font that fits the vibe: Inter, DM Sans, IBM Plex Mono, Geist, Outfit, Plus Jakarta Sans
- Primary action: large, centered, impossible to miss — colored CTA with hover animation
- Secondary controls: clearly subordinate (smaller, lower contrast)
- If it's a TOOL: inputs are full-width, 48px tall, with clear labels; output shows instantly with a micro-animation
- If it's a WIDGET/DISPLAY: large typography for the primary data point, supporting info at smaller scale
- If it's CRUD/LIST: sidebar or list panel + detail view; items are rows with avatar/icon, title, meta, action
- Empty state: styled illustration (CSS shapes/lines) + call-to-action — never a blank white void
- Loading state: skeleton shimmer animation or spinner in brand color
- Success state: checkmark animation (SVG stroke animation) or subtle confetti burst`,
};

export type BuildHtmlArtifactPromptOptions = {
  /**
   * Pre-detected type info. Skips the regex pass when caller already has it
   * (mirrors how desktop-mode.jsx hoists htmlTypeInfo for fallback dims on
   * parse failure).
   */
  typeInfo?: HtmlArtifactType;
  /**
   * Optional system context that overrides the default DESIGN.md aesthetic.
   * Empty string when not present (matches `buildSystemContextRef.current?.()`
   * returning '' on the web side).
   */
  systemContext?: string;
};

export function buildHtmlArtifactPrompt(
  userPrompt: string,
  opts: BuildHtmlArtifactPromptOptions = {}
): string {
  const __userIntent = userPrompt;
  const typeInfo = opts.typeInfo ?? detectHtmlArtifactType(userPrompt);
  const dims = typeInfo.dims;
  const typeGuide = HTML_TYPE_GUIDES[typeInfo.kind] ?? HTML_TYPE_GUIDES["App / Tool / Widget"];

  const __sysCtx = opts.systemContext ?? "";
  const __hasDS = __sysCtx.length > 0;
  const __dsBlock = __hasDS
    ? `
DESIGN SYSTEM OVERRIDE (CRITICAL — supersedes all defaults below):
The active design system is specified above. You MUST apply it:
- Extract its colors and define them as CSS custom properties at the top of your <style> block (e.g. --color-primary: #...; --color-bg: #...; etc.)
- Use ONLY those colors — no arbitrary hex codes unless the design system specifies them
- Apply its font-family to body and override any type-specific fonts below
- Match its border-radius scale for cards, buttons, inputs
- Honor any AVOID rules as absolute prohibitions — violating them is a critical failure
🚫 Do NOT use default browser blue (#0070f3, #1DA1F2, etc.) or arbitrary colors when a design system is active
`
    : "";

  // Image map and research sections aren't wired in apps/mac yet; web's prompt
  // composes them in but they default to '' when no images / research are
  // attached. Keep parity by emitting empty strings here.
  const __researchSection = "";
  const __imgMapSection = "";

  return `${__sysCtx}You are a principal engineer and designer at a world-class product studio — the kind that ships Stripe, Linear, Vercel, or Arc. Your HTML output is indistinguishable from what a 6-person elite team would deliver after a month of polish. The user wants: "${__userIntent.substring(0, 1000)}"
${__researchSection}${__imgMapSection}${__dsBlock}${typeGuide}

STRUCTURE & LAYOUT (non-negotiable):
- Generate a COMPLETE self-contained HTML document (<!DOCTYPE html>…</html>)
- All CSS in a <style> block in <head> — define CSS custom properties first, then base styles, then components
- All JavaScript in a <script> block before </body>
- External deps allowed: Google Fonts CDN, Lucide icons CDN (https://unpkg.com/lucide@latest), Tailwind CDN if needed
- Renders inside an iframe — must be 100% self-contained (no fetch calls to external APIs)
- If image/video URLs are in the prompt, embed them exactly with <img src> / <video src>. Token strings of the form __IMG_DATA_URL_<digits>__ or __VID_DATA_URL_<digits>__ are REAL image/video references that get rewritten to actual URLs at render time — copy them VERBATIM as the src attribute value, do NOT treat them as placeholders to fill in.
- 🚫 FORBIDDEN: Never use unsplash.com, picsum.photos, placeholder.com, via.placeholder.com, source.unsplash, or ANY external stock-photo / placeholder image service. The only acceptable image sources are URLs/tokens explicitly provided in the prompt (data: URLs, http(s) URLs, or __IMG_DATA_URL_*__ tokens).
- VIEWPORT FILL: html, body always have width:100%; height:100%; margin:0; padding:0. Root container: width:100%; height:100vh. UI fills the ENTIRE viewport — no fixed pixel outer dimensions, no empty whitespace borders.
- For top-bar + scrollable-content + bottom-bar layouts: root is display:flex; flex-direction:column; height:100vh. Top: fixed height. Content: flex:1; overflow-y:auto. Bottom: fixed height.
- 🚫 NEVER render fake device chrome (status bars, battery, signal, time, phone frames)

CSS CRAFT (sets the quality ceiling — apply to every element):
- CSS custom properties for ALL design tokens: --color-*, --radius-*, --shadow-*, --font-*, --space-*
- text-rendering:optimizeLegibility; -webkit-font-smoothing:antialiased on body — always
- EVERY interactive element has a transition: buttons 0.15s ease, panels 0.25s ease, page sections 0.35s ease
- Hover states on ALL clickable elements (color shift + scale(1.02) + shadow deepening)
- Active/pressed state: scale(0.97) for buttons, instant color swap for toggles
- focus-visible: 2px outline in primary color (keyboard accessibility)
- Elevation system: cards 0 1px 3px rgba(0,0,0,0.08); dropdowns 0 8px 32px rgba(0,0,0,0.2); modals 0 24px 64px rgba(0,0,0,0.35)
- Entrance animations: @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } } — apply to cards, list items, panels appearing
- Loading shimmer for async content: @keyframes shimmer { to { background-position:200% 0 } }

JAVASCRIPT QUALITY:
- const/let only, arrow functions, template literals — no var, no old-style callbacks
- Reactive UI: keep a state object; when state changes, re-render only the affected element (innerHTML or classList)
- requestAnimationFrame for ALL animation loops — never setInterval/setTimeout for visual updates
- Debounce input handlers (search, resize) with a simple 150ms debounce
- Loading → success → error state flow for any operation that takes time: show spinner, then result, catch errors gracefully
- IntersectionObserver for scroll-triggered animations (use on all above-fold hidden elements on landing pages)

PRODUCTION-QUALITY CONTENT (placeholder data = critical failure):
- Every person: specific real-sounding name ("Maya Patel", "Carlos Reyes", "James Okonkwo" — NOT "John Doe" or "User 1")
- Every metric: specific number with proper units ("$24,847", "94.3%", "2.4s", "1.2M req/s" — NOT "100" or "N/A")
- Every date: plausible and contextually correct ("Mar 14, 2026", "3 hours ago" — NOT "Jan 1, 2024")
- Every product/brand/feature: real-sounding specific name ("Velocity Analytics", "Prism UI Kit" — NOT "Product Name")
- Every chart: real data arrays with variance — NOT uniform bars or flat lines
- Content density: fill the screen — no large empty areas, no "Coming Soon", no "[Content Here]"
- 🚫 Lorem ipsum, "Item 1", "Sample text", "TODO", placeholder brackets are FORBIDDEN

Include a <title> tag inside <head> with a short descriptive name (max 30 chars) — this becomes the window title.
Target viewport dimensions: ${dims.w}×${dims.h}px.

Output ONLY the complete HTML document. Start with <!DOCTYPE html> and end with </html>. No markdown fences, no JSON wrapper, no preamble, no commentary before or after. Just the raw HTML.`;
}
