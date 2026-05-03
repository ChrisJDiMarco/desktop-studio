import {
  ActivityIcon,
  BarChart3Icon,
  BellIcon,
  BookOpenIcon,
  BoxesIcon,
  BrainIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarIcon,
  CircuitBoardIcon,
  CpuIcon,
  DatabaseIcon,
  EyeIcon,
  Gamepad2Icon,
  GlobeIcon,
  GraduationCapIcon,
  HandshakeIcon,
  HeartIcon,
  LineChartIcon,
  MailIcon,
  MegaphoneIcon,
  Music2Icon,
  PaletteIcon,
  PenToolIcon,
  PlayIcon,
  RocketIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SunIcon,
  TargetIcon,
  UsersIcon,
  VideoIcon,
  WorkflowIcon,
  WrenchIcon,
} from 'lucide-react';

// ─── Scenes Data ────────────────────────────────────────────────────────────

export const THINKLET_SCENES_AUDIENCE = 'Thinklet Scenes';

export const SCENE_AUDIENCE_CATEGORIES = [
  {
    id: 'thinklet-scenes',
    label: THINKLET_SCENES_AUDIENCE,
    shortLabel: 'Thinklet',
    icon: BrainIcon,
    detail: 'Default demos that show the playful range of research, media, and builds.',
  },
  {
    id: 'founders-growth',
    label: 'Founders & Growth',
    shortLabel: 'Founders',
    icon: RocketIcon,
    detail: 'Launch rooms, growth loops, customer signals, investor updates, and market motion.',
  },
  {
    id: 'creative-studios',
    label: 'Creative Studios',
    shortLabel: 'Creative',
    icon: PenToolIcon,
    detail: 'Campaign worlds, brand systems, storyboards, media production, and client delivery.',
  },
  {
    id: 'enterprise-ops',
    label: 'Enterprise Ops',
    shortLabel: 'Ops',
    icon: Building2Icon,
    detail: 'Executive command centers, SOPs, risk, finance, planning, and team coordination.',
  },
  {
    id: 'sales-customer',
    label: 'Sales & Customer Teams',
    shortLabel: 'Sales',
    icon: HandshakeIcon,
    detail: 'Account rooms, CRM intelligence, support escalation, renewal health, and outreach.',
  },
  {
    id: 'product-design',
    label: 'Product & Design',
    shortLabel: 'Product',
    icon: BoxesIcon,
    detail: 'Roadmaps, UX labs, design systems, release rooms, and user feedback loops.',
  },
  {
    id: 'research-intelligence',
    label: 'Research & Intelligence',
    shortLabel: 'Intel',
    icon: BrainIcon,
    detail: 'Competitive intelligence, policy tracking, due diligence, datasets, and briefings.',
  },
  {
    id: 'personal-operators',
    label: 'Personal Operators',
    shortLabel: 'Personal',
    icon: CalendarIcon,
    detail: 'Life admin, learning, money, health, travel, writing, and personal operating systems.',
  },
];

export const THINKLET_SCENE_CREATION_GUIDE = `
A Thinklet Scene is an intelligently composed workspace collection, not one artifact.
The planner should choose the perfect set of windows for the user's goal:
- Research windows for live/current/context gathering and source-backed briefings.
- HTML artifacts for polished reports, dashboards, landing pages, boards, briefs, galleries, and visual reference surfaces.
- React Thinklet tools for persistent interactive apps, stateful workflows, uploads/exports, charts, forms, AI buttons, file handling, automation controls, and user-owned data.
- Generated images, videos, or audio when they materially improve the workspace.
- Automation or connector Thinklets when integrations such as Gmail, Slack, GitHub, Google Sheets, Drive, Calendar, Notion, HubSpot, Salesforce, Stripe, Airtable, Jira, Linear, social channels, or other Composio APIs are useful.
Every scene should feel like a ready-to-use desktop: 2-5 purposeful windows, clear relationships, no filler, no generic placeholders. Choose tools based on the user's intent rather than forcing a fixed template.
`.trim();

export const THINKLET_CAPABILITY_CONTEXT = `
Thinklet capability map available to scene planning:
- Architecture: single-file React component, default App-style function, props content and updateContent, hosted inside the Thinklet desktop runtime.
- Persistence: TQL only. Available operations include set, push, pull, updateOne, batch, increment, multiply, unset, rename, toggle, append, addToDate, updateNested, updateMany, move, sort, addUnique, merge, and conditional. Use debounced writes for continuous input and batched writes for multi-field updates.
- AI APIs: aiApi.generate for text and structured JSON, aiApi.generate with model:"sonar" for Perplexity-style web research, aiApi.generateImage for text-to-image, aiApi.analyzeImage for image analysis/transforms/OCR-style work, aiApi.scrapeUrl for public HTTPS extraction, aiApi.generateAudio for text-to-speech, and aiApi.generateVideo for text-to-video or image-to-video. All AI actions must be user-initiated and wrapped in useMutation.
- Files and export: useFileImport for image/PDF/CSV/JSON/video uploads; useExport for PDF, CSV, Markdown, JSON, screenshots, and downloadFromUrl. Never use Blob, URL.createObjectURL, window.print, localStorage, or sessionStorage.
- UI and data libraries: React, framer-motion, lucide-react icons with Icon suffix, shadcn/ui, recharts, three, TanStack React Query, react-hook-form, zod, lodash/debounce, and MarkdownRenderer.
- Buildable Thinklets: notes, journals, wikis, task managers, kanban, CRMs, databases, spreadsheet-style tables, flashcards, research assistants, document summarizers, image generators/editors, podcast/audio tools, video generators, writing assistants, dashboards, charts, Three.js viewers, product tools, timers, games, forms, approval flows, calculators, galleries, invoices, polls, leaderboards, and comment/review tools.
- Integrations: Thinklets can expose connector workflows for Gmail, Slack, GitHub, Notion, Sheets, Docs, Drive, Calendar, Linear, Jira, Airtable, HubSpot, Salesforce, Stripe, LinkedIn, X/Twitter, Discord, YouTube, Instagram, and similar SaaS APIs through Composio-style connected actions.
- Styling: Tailwind-only for Thinklets, explicit media dimensions for audio/video containers, overflow-safe dialogs, responsive controls, polished states, no fake APIs, no unsupported libraries, no auto-triggered AI calls on mount or input change.
`.trim();

const withSceneWorkspaceContext = (scene) => ({
  ...scene,
  displayPrompt: scene.displayPrompt || scene.prompt,
  executionPrompt: `Create this as a Thinklet Scene: a composed desktop workspace with the right mix of HTML artifacts, React Thinklet tools, research, generated media, connector-aware automations, and relationships between windows. Build 2-5 purposeful windows chosen for the user's goal; avoid filler and generic placeholders.

Scene goal:
${scene.prompt}`,
});

const THINKLET_DEFAULT_PROMPTS = [
  // ── Research + Build ──
  { id: 'news-monster', label: '📰 News Monster Collage', icon: GlobeIcon, category: 'Research + Build', prompt: 'Research the latest global news headlines from today, then generate an AI image of a fuzzy cuddling anthropomorphic monster expressing how he feels about the news with a word cloud of headlines around him, and then build a highly detailed CSS recreation of a newspaper front page about today\'s top stories using the real headlines from the research.' },
  { id: 'stock-dashboard', label: '📈 Live Stock Tracker', icon: ActivityIcon, category: 'Research + Build', prompt: 'Research the top 10 trending stocks today with their prices, percentage changes, and market sentiment, then build a professional dark-mode stock trading dashboard displaying real-time data cards, sparkline charts, and a news ticker with actual headlines about each stock.' },
  { id: 'crypto-pulse', label: '💎 Crypto Pulse Monitor', icon: CpuIcon, category: 'Research + Build', prompt: 'Research the top 8 cryptocurrencies with their current prices, 24h change, and market cap, then build a neon-themed cyberpunk crypto monitoring dashboard with live price cards, mini charts, and a fear/greed indicator. Use actual data from the research — no fake numbers.' },
  { id: 'ai-trends', label: '🤖 AI Trends Report', icon: BrainIcon, category: 'Research + Build', prompt: 'Do deep research on the latest AI industry news from this week — new model releases, startup funding, regulatory developments, breakthrough papers — then build a professional tech publication-style webpage presenting the findings as a curated AI trends report with sections, pull quotes, and data visualizations.' },
  { id: 'movie-tonight', label: '🎬 Movie Night Picker', icon: PlayIcon, category: 'Research + Build', prompt: 'Research the top 10 movies currently in theaters or trending on streaming platforms with their ratings, genres, and brief synopses, then build a sleek movie browsing app with poster cards, rating badges, and genre filters. Dark cinema-themed design with bold typography.' },
  { id: 'music-charts', label: '🎵 Music Charts Dashboard', icon: Music2Icon, category: 'Research + Build', prompt: 'Research the current top 10 songs on the global charts with artist names, album info, and streaming numbers, then build a music streaming-style dashboard with album art placeholders, play buttons, chart position indicators, and a "Now Playing" bar. Use a dark Spotify-inspired design with vibrant accent colors.' },
  { id: 'fitness-plan', label: '💪 Personalized Fitness Hub', icon: HeartIcon, category: 'Research + Build', prompt: 'Research the latest evidence-based fitness trends, popular workout routines, and nutrition tips for 2025, then build a vibrant fitness tracking app interface with workout cards, a weekly planner, progress rings, and motivational quotes. Use energetic gradients and bold sans-serif typography.' },
  { id: 'travel-guide', label: '✈️ Instant Travel Guide', icon: GlobeIcon, category: 'Research + Build', prompt: 'Research the top 5 travel destinations trending right now with flight price ranges, best time to visit, and must-see attractions, then generate 2 AI images of stunning travel landscapes, then build a luxury travel guide website with destination cards, pricing info, and the AI-generated hero imagery.' },
  { id: 'crypto-video-dashboard', label: '💎 Crypto Dashboard + Video', icon: CpuIcon, category: 'Research + Build', prompt: 'Research the top 8 cryptocurrencies with their current prices, 24h change, and market cap, then generate an AI video of abstract blockchain data streams flowing through a dark digital void with cyan and purple particle effects as a seamless loop, then build a neon-themed cyberpunk crypto monitoring dashboard with the video as hero background and real price data displayed in glassmorphic cards with mini charts.' },
  { id: 'fitness-video-tracker', label: '💪 Fitness Hub + Video Hero', icon: HeartIcon, category: 'Research + Build', prompt: 'Research the latest evidence-based fitness trends and popular workout routines for 2025, then generate an AI video of an energetic abstract fitness scene with dynamic motion blur and warm gradient lighting as a seamless loop, then build a vibrant fitness tracking app interface with the video as the hero section background, workout cards populated with real trend data, a weekly planner, and progress rings.' },
  // ── Research + Image ──
  { id: 'weather-art', label: '🌤️ Weather Art Gallery', icon: SunIcon, category: 'Research + Image', prompt: 'Research the current weather conditions in 6 major cities around the world (Tokyo, Paris, New York, Sydney, Cairo, Rio de Janeiro), then generate 3 AI images — each depicting a surreal artistic interpretation of today\'s weather in a different city, then build a beautiful gallery webpage showcasing the weather art with real temperature data overlaid.' },
  { id: 'space-briefing', label: '🚀 Space Mission Briefing', icon: GlobeIcon, category: 'Research + Image', prompt: 'Research the latest space news — NASA missions, SpaceX launches, astronomical discoveries from this week — then generate an AI image of a dramatic deep space scene, then build a futuristic space mission briefing dashboard with dark mode, holographic-style UI elements, and real mission data from the research.' },
  { id: 'recipe-explorer', label: '🍳 AI Recipe Explorer', icon: BookOpenIcon, category: 'Research + Image', prompt: 'Research the top 5 trending recipes on the internet right now, then build a gorgeous recipe card grid website with each recipe having real ingredients, instructions, and estimated cook times. Use warm earthy tones, large food photography placeholders, and a magazine-style editorial layout.' },
  // ── Video Scenes ──
  { id: 'cinematic-hero', label: '🎬 Cinematic Hero Landing', icon: VideoIcon, category: 'Video Scenes', prompt: 'Generate an AI video of a smooth cinematic aerial flyover of a futuristic neon-lit city at night with rain reflections, then build a premium SaaS landing page using that video as a full-bleed hero background. Include glassmorphic cards, bold headline typography, and a gradient CTA button floating over the video.' },
  { id: 'ocean-meditation', label: '🌊 Ocean Meditation App', icon: VideoIcon, category: 'Video Scenes', prompt: 'Generate an AI video of gentle ocean waves crashing on a pristine beach at golden hour with smooth seamless loop, then build a meditation and wellness app interface using that video as the hero background. Include a breathing exercise timer, session cards, calming color palette, and soft rounded UI elements.' },
  { id: 'aurora-dashboard', label: '🌌 Aurora Data Dashboard', icon: VideoIcon, category: 'Video Scenes', prompt: 'Generate an AI video of swirling aurora borealis over a frozen arctic landscape with subtle motion seamless loop, then build a professional analytics dashboard with that video as a hero section background. Include KPI metric cards, trend line charts, a dark mode sidebar, and data-dense tables with the aurora video creating atmosphere behind the header.' },
  { id: 'forest-portfolio', label: '🌿 Enchanted Forest Portfolio', icon: VideoIcon, category: 'Video Scenes', prompt: 'Generate an AI video of sunlight filtering through a dense enchanted forest canopy with floating particles and gentle motion, then build a creative portfolio website with that video as the hero section. Include project showcase cards, a skills section, about me with a circular avatar, and contact form. Earthy tones with gold accents.' },
  { id: 'abstract-saas', label: '✨ Abstract Flow SaaS', icon: VideoIcon, category: 'Video Scenes', prompt: 'Generate an AI video of abstract flowing liquid metallic shapes morphing smoothly in deep violet and cyan tones with seamless loop, then build a modern SaaS product page with that video behind the hero section. Include feature cards with icons, pricing tiers, testimonial carousel, and a bold gradient header.' },
  { id: 'underwater-gallery', label: '🐠 Underwater Art Gallery', icon: VideoIcon, category: 'Video Scenes', prompt: 'Generate an AI video of a dreamlike underwater scene with bioluminescent jellyfish drifting slowly through deep blue water with seamless loop, then build an art gallery website with that video as the full-page background. Include floating glass-effect cards for artwork, a masonry grid gallery, and ethereal typography.' },
  // ── Multi-Asset ──
  { id: 'brand-kit', label: '🎨 Instant Brand Kit', icon: PaletteIcon, category: 'Multi-Asset', prompt: 'Generate 4 AI images: a hero background, a product mockup, a team photo placeholder, and an abstract pattern — then build a complete brand landing page using all 4 images placed in their appropriate sections. Include navigation, hero with CTA, features grid, team section, and footer.' },
  { id: 'product-launch', label: '🚀 Product Launch Page', icon: TargetIcon, category: 'Multi-Asset', prompt: 'Generate an AI video of a sleek product rotating on a dark pedestal with dramatic lighting and seamless loop, then generate 3 AI images of the product from different angles, then build a premium product launch page with the video as hero background and the images in a features showcase section.' },
  { id: 'event-promo', label: '🎉 Event Promo Site', icon: BellIcon, category: 'Multi-Asset', prompt: 'Research the latest trends in event design and conferences, generate an AI video of an energetic crowd at a concert with colorful stage lighting seamless loop, generate 2 AI images of speaker portraits, then build an event promotional website with video hero, speaker cards, schedule timeline, ticket tiers, and venue map section.' },
  { id: 'full-brand-video', label: '🎬 Full Brand Kit + Video', icon: VideoIcon, category: 'Multi-Asset', prompt: 'Generate an AI video of a sleek product rotating on a dark pedestal with dramatic lighting and seamless loop, then generate 4 AI images: a hero background, a product mockup, a team photo placeholder, and an abstract brand pattern — then build a complete premium brand landing page using the video as the hero background and all 4 images placed in their appropriate sections including navigation, features grid, team section, and footer.' },
  { id: 'event-video-promo', label: '🎉 Event Site + Video + Images', icon: BellIcon, category: 'Multi-Asset', prompt: 'Research the latest trends in event design and tech conferences, generate an AI video of an energetic crowd at a concert with colorful stage lighting seamless loop, generate 3 AI images of professional speaker portraits, then build an event promotional website with the video hero, speaker cards using the generated images, a schedule timeline populated with realistic session data, ticket tiers, and venue info section.' },
  // ── Research + Video + Build ──
  { id: 'news-video-hero', label: '📺 News Video Dashboard', icon: VideoIcon, category: 'Research + Video + Build', prompt: 'Research the latest global news headlines from today, then generate an AI video of a dramatic newsroom environment with scrolling tickers and screen overlays as a seamless loop, then build a professional news dashboard using the video as a full-bleed hero background with real headlines from the research overlaid on glassmorphic cards.' },
  { id: 'stock-video-terminal', label: '📊 Live Stock Terminal + Video', icon: ActivityIcon, category: 'Research + Video + Build', prompt: 'Research the top 10 trending stocks today with their prices and percentage changes, then generate an AI video of abstract financial data flowing through a dark digital void with green and red particle streams as a seamless loop, then build a professional dark-mode stock trading terminal with the video as the hero background and real stock data from the research displayed in cards and sparkline charts.' },
  { id: 'space-video-briefing', label: '🚀 Space Briefing + Video', icon: GlobeIcon, category: 'Research + Video + Build', prompt: 'Research the latest space news — NASA missions, SpaceX launches, astronomical discoveries from this week — then generate an AI video of a cinematic deep space nebula flythrough with stars and cosmic dust as a seamless loop, then build a futuristic space mission briefing dashboard with the video as the full-page background and real mission data from the research displayed in holographic-style UI elements.' },
  { id: 'ai-trends-video', label: '🤖 AI Trends + Video Report', icon: BrainIcon, category: 'Research + Video + Build', prompt: 'Do deep research on the latest AI industry news from this week — new model releases, startup funding, regulatory developments — then generate an AI video of abstract neural network connections pulsing with light against a dark background as a seamless loop, then build a tech publication-style page with the video as the hero section background and the research findings presented as a curated trends report with sections, data visualizations, and source citations.' },
  { id: 'weather-video-app', label: '🌤️ Weather App + Video Sky', icon: GlobeIcon, category: 'Research + Video + Build', prompt: 'Research the current weather conditions in 5 major cities around the world (Tokyo, Paris, New York, Sydney, London), then generate an AI video of a beautiful time-lapse sky with clouds drifting and sun rays breaking through as a seamless loop, then build a premium weather dashboard app with the video as the main background and real temperature data from the research displayed in clean floating cards with weather icons.' },
  // ── Creative ──
  { id: 'retro-arcade', label: '🕹️ Retro Arcade Cabinet', icon: Gamepad2Icon, category: 'Creative', prompt: 'Build an interactive retro arcade game cabinet interface with pixel art styling, neon glow effects, a game selection grid, high score leaderboard, and animated coin-insert prompt. Use a CRT scanline overlay effect and 80s arcade color palette with hot pink and electric cyan.' },
  { id: 'magazine-editorial', label: '📖 Digital Magazine Spread', icon: BookOpenIcon, category: 'Creative', prompt: 'Research the top 3 breaking stories in technology today, then build a stunning digital magazine editorial layout with multi-column text, pull quotes, large editorial photography placeholders, drop caps, serif typography, and a sophisticated black-and-white color scheme with one accent color.' },
  { id: 'virtual-museum', label: '🏛️ Virtual Art Museum', icon: EyeIcon, category: 'Creative', prompt: 'Generate 5 AI images of different abstract artworks in various styles (impressionist, cubist, surrealist, minimalist, pop art), then build a virtual museum gallery with room-like sections, each artwork displayed on a wall with a description card, ambient lighting effects, and elegant navigation between rooms.' },
  { id: 'immersive-portfolio-video', label: '🎬 Immersive Video Portfolio', icon: VideoIcon, category: 'Creative', prompt: 'Generate an AI video of smooth cinematic abstract liquid metallic shapes morphing in deep violet and gold tones as a seamless loop, then generate 3 AI images of stunning creative project thumbnails in different styles, then build a creative portfolio website with the video as the full-page hero background, the images in a masonry gallery, and elegant navigation with scroll-triggered animations.' },
  { id: 'music-video-player', label: '🎵 Music Player + Visualizer Video', icon: Music2Icon, category: 'Creative', prompt: 'Generate an AI video of abstract audio waveforms and particle equalizer bars pulsing rhythmically in neon colors against a dark background as a seamless loop, then build a dark-themed music streaming interface with the video as the now-playing background, album art grid, playlist sidebar, and a sleek playback bar with progress indicator.' },
];

const PROFESSIONAL_SCENE_PROMPTS = [
  // ── Founders & Growth ──
  { id: 'founder-launch-room', label: '🚀 Founder Launch Room', icon: RocketIcon, audience: 'Founders & Growth', category: 'Launch Command', prompt: 'Create a complete founder launch scene: research the target market and competitors, build a launch command dashboard with positioning, launch timeline, beta user segments, risk flags, and KPI cards; generate a premium hero image for the product vision; create a short motion teaser concept; and add Thinklet tools for drafting landing-page copy, launch emails, and daily launch updates. If connected API integrations are available, include hooks for Google Sheets metrics, Gmail outreach, Slack updates, GitHub issues, and Stripe or analytics data.' },
  { id: 'growth-experiment-lab', label: '📈 Growth Experiment Lab', icon: LineChartIcon, audience: 'Founders & Growth', category: 'Growth Loops', prompt: 'Create a growth experiment workspace scene for a startup: build an HTML experiment board with ICE scoring, acquisition channels, cohort metrics, and a learning log; generate ad creative image directions; create a short video storyboard for the best experiment; and add Thinklet automation cards that can pull data from analytics, Stripe, HubSpot, Airtable, or Google Sheets when connected.' },
  { id: 'investor-update-studio', label: '💼 Investor Update Studio', icon: BriefcaseIcon, audience: 'Founders & Growth', category: 'Fundraising', prompt: 'Create an investor update scene: research the latest market narrative for the company category, build a polished founder update dashboard with traction metrics, wins, asks, runway, hiring needs, and product screenshots; generate one clean chart-focused image; and create Thinklet tools for turning raw notes into investor emails, board slides, and follow-up tasks. Include optional integrations for Gmail, Calendar, Google Drive, Notion, and Stripe metrics.' },
  { id: 'pricing-intelligence-room', label: '💎 Pricing Intelligence Room', icon: BarChart3Icon, audience: 'Founders & Growth', category: 'Market Intelligence', prompt: 'Create a pricing intelligence scene: research comparable tools and current pricing pages, build a competitive pricing matrix with packaging recommendations, willingness-to-pay assumptions, margin notes, and experiment ideas; generate a clean visual pricing architecture image; and add Thinklet tools for running one-off pricing CRISPR updates to a landing page artifact. Include optional connectors for Stripe, HubSpot, Google Sheets, and website scraping.' },

  // ── Creative Studios ──
  { id: 'campaign-war-room', label: '🎯 Campaign War Room', icon: MegaphoneIcon, audience: 'Creative Studios', category: 'Campaign Studio', prompt: 'Create a high-end campaign war room scene for a creative team: build an HTML command center with audience insights, core message, channel plan, deliverable checklist, shoot list, launch calendar, and approval status; generate 3 campaign key visual directions as images; create a 15-second video concept board; and include Thinklet tools for repurposing the campaign into social posts, emails, ads, and client notes. Use connected Slack, Google Drive, Calendar, and social scheduling APIs when available.' },
  { id: 'brand-system-lab', label: '🎨 Brand System Lab', icon: PaletteIcon, audience: 'Creative Studios', category: 'Brand Systems', prompt: 'Create a brand system workspace scene: generate a visual identity direction with logo mood, palette, type scale, art direction, and sample layouts; build a brand guidelines HTML artifact; generate supporting pattern and hero imagery; and add Thinklet tools for creating landing sections, social templates, email headers, and CRISPR-safe brand refreshes across existing artifacts.' },
  { id: 'video-storyboard-room', label: '🎬 Video Storyboard Room', icon: VideoIcon, audience: 'Creative Studios', category: 'Motion Studio', prompt: 'Create a video production storyboard scene: build an HTML storyboard board with beats, camera moves, VO copy, shot list, asset needs, timing, and revision notes; generate cinematic keyframes for the hero moments; create a motion reference video prompt; and include Thinklet tools for converting client notes into shot revisions, production tasks, and export-ready prompt packs.' },
  { id: 'client-presentation-factory', label: '✨ Client Presentation Factory', icon: PenToolIcon, audience: 'Creative Studios', category: 'Client Delivery', prompt: 'Create a client presentation factory scene: build a polished HTML review room with brief summary, creative territories, deliverables, timeline, comments, decision log, and next steps; generate premium mockup imagery for 3 directions; and add Thinklet tools for producing client-ready summaries, revision diffs, approval emails, and before-after CRISPR updates.' },

  // ── Enterprise Ops ──
  { id: 'executive-command-center', label: '🏢 Executive Command Center', icon: Building2Icon, audience: 'Enterprise Ops', category: 'Executive Ops', prompt: 'Create an executive command center scene: build a dense but elegant HTML dashboard with OKRs, revenue pulse, customer health, operational risks, product milestones, hiring priorities, and exec decisions; generate an executive briefing image; and add Thinklet agents for summarizing Slack, Gmail, Calendar, Linear, Jira, Salesforce, and Google Sheets data when integrations are connected.' },
  { id: 'finance-close-room', label: '📊 Finance Close Room', icon: BarChart3Icon, audience: 'Enterprise Ops', category: 'Finance Ops', prompt: 'Create a finance close scene: build an HTML close cockpit with month-end checklist, variance analysis, cash runway, receivables, payables, vendor alerts, and approval queues; generate a clean finance visual; and add Thinklet tools for reconciling spreadsheet notes, drafting CFO summaries, and sending follow-ups through Gmail or Slack. Include optional Google Sheets, QuickBooks, Stripe, and Drive integrations.' },
  { id: 'compliance-briefing-room', label: '🛡️ Compliance Briefing Room', icon: ShieldCheckIcon, audience: 'Enterprise Ops', category: 'Risk & Compliance', prompt: 'Create a compliance briefing scene: research relevant regulatory updates for a chosen industry, build an HTML risk register with policy changes, owners, evidence links, control status, and remediation timelines; generate a calm executive briefing visual; and add Thinklet tools that can watch Drive, Slack, Jira, GitHub, and policy docs for changes when connected.' },
  { id: 'sop-automation-hub', label: '⚙️ SOP Automation Hub', icon: WorkflowIcon, audience: 'Enterprise Ops', category: 'Process Automation', prompt: 'Create an SOP automation scene: build an HTML process map with roles, handoffs, source systems, failure points, automation candidates, and audit trail; create Thinklet tools for turning SOP text into checklists, agents, and CRISPR updates; generate a diagram image; and include optional integrations for Notion, Google Docs, Slack, Jira, Linear, Airtable, and email.' },

  // ── Sales & Customer Teams ──
  { id: 'account-command-room', label: '🤝 Account Command Room', icon: HandshakeIcon, audience: 'Sales & Customer Teams', category: 'Revenue', prompt: 'Create a strategic account room scene: build an HTML account dossier with stakeholders, buying committee, pain points, open opportunities, relationship map, recent news, meeting notes, next actions, and renewal risk; generate an account-map visual; and add Thinklet tools for drafting follow-up emails, call briefs, and CRM updates using HubSpot, Salesforce, Gmail, Calendar, Slack, and LinkedIn-style research when connected.' },
  { id: 'support-escalation-radar', label: '📡 Support Escalation Radar', icon: ActivityIcon, audience: 'Sales & Customer Teams', category: 'Customer Ops', prompt: 'Create a customer support escalation radar scene: build an HTML operations board with priority incidents, customer impact, sentiment, SLA clocks, owner lanes, root-cause notes, and executive-ready updates; generate a calm status-room image; and add Thinklet tools that can summarize tickets, Slack threads, emails, and product issues from Zendesk, Intercom, Jira, Linear, Gmail, and Slack when connected.' },
  { id: 'outbound-personalization-studio', label: '✉️ Outbound Personalization Studio', icon: MailIcon, audience: 'Sales & Customer Teams', category: 'Outbound', prompt: 'Create an outbound personalization scene: research a target account list, build an HTML prospecting studio with personas, triggers, objection map, sequence plan, and message variants; generate a visual for each persona cluster; and add Thinklet tools for generating highly specific emails, LinkedIn notes, call openers, and CRM tasks through Gmail, HubSpot, Salesforce, Apollo-style lists, and Google Sheets when connected.' },
  { id: 'renewal-health-desk', label: '💚 Renewal Health Desk', icon: UsersIcon, audience: 'Sales & Customer Teams', category: 'Revenue', prompt: 'Create a renewal health scene: build an HTML retention dashboard with account health, usage signals, champion status, open tickets, contract milestones, value proof, risk reasons, and save plays; generate one customer-success briefing image; and add Thinklet agents for pulling CRM, product analytics, support tickets, Slack mentions, Google Docs QBRs, and Calendar events when connected.' },

  // ── Product & Design ──
  { id: 'roadmap-control-room', label: '🧭 Roadmap Control Room', icon: BoxesIcon, audience: 'Product & Design', category: 'Product Strategy', prompt: 'Create a product roadmap scene: build an HTML roadmap control room with bets, evidence, customer requests, engineering confidence, launch windows, dependencies, and tradeoff notes; generate a product narrative visual; and add Thinklet tools for turning Slack threads, Linear or Jira issues, GitHub PRs, Notion docs, and customer interviews into roadmap updates when connected.' },
  { id: 'ux-research-lab', label: '👁️ UX Research Lab', icon: EyeIcon, audience: 'Product & Design', category: 'User Research', prompt: 'Create a UX research lab scene: build an HTML synthesis board with interview clips, Jobs-to-be-Done, friction patterns, quote clusters, opportunity areas, and prototype recommendations; generate an empathy-map visual; and add Thinklet tools for summarizing transcripts, Drive notes, Figma-style comments, support tickets, and research docs into actionable product artifacts.' },
  { id: 'design-system-auditor', label: '🧩 Design System Auditor', icon: PaletteIcon, audience: 'Product & Design', category: 'Design Systems', prompt: 'Create a design system audit scene: build an HTML audit board with components, accessibility issues, token gaps, visual inconsistencies, adoption metrics, and recommended fixes; generate before-after UI mockup images; and add Thinklet CRISPR tools that can update HTML artifacts to match the design system with precise find/replace patches.' },
  { id: 'release-readiness-room', label: '🛠️ Release Readiness Room', icon: WrenchIcon, audience: 'Product & Design', category: 'Release Ops', prompt: 'Create a release readiness scene: build an HTML launch readiness room with feature checklist, QA status, risk register, migration notes, docs, comms, support prep, and rollback plan; generate a release hero visual; and add Thinklet tools for summarizing GitHub PRs, Linear tickets, docs, changelogs, Slack threads, and customer messaging when connected.' },

  // ── Research & Intelligence ──
  { id: 'competitor-intel-briefing', label: '🧠 Competitor Intel Briefing', icon: BrainIcon, audience: 'Research & Intelligence', category: 'Competitive Intel', prompt: 'Create a competitor intelligence scene: research top competitors and recent changes, build an HTML briefing room with product moves, pricing shifts, positioning, customer sentiment, feature gaps, threat level, and recommended counterplays; generate a market map image; and add Thinklet tools for monitoring websites, news, Google Sheets, Slack, and CRM notes when connected.' },
  { id: 'policy-monitoring-room', label: '🌐 Policy Monitoring Room', icon: GlobeIcon, audience: 'Research & Intelligence', category: 'Regulatory', prompt: 'Create a policy monitoring scene: research current policy and regulatory updates for a chosen domain, build an HTML monitoring room with affected regions, deadlines, obligations, uncertainty, source links, and action owners; generate an executive policy visual; and add Thinklet tools for scheduled monitoring, source summaries, and stakeholder briefs through email, Slack, Drive, and Docs when connected.' },
  { id: 'due-diligence-data-room', label: '🗄️ Due Diligence Data Room', icon: DatabaseIcon, audience: 'Research & Intelligence', category: 'Diligence', prompt: 'Create a due diligence data room scene: build an HTML diligence workspace with company overview, market, product, team, financials, risks, open questions, document checklist, and investment memo outline; generate a clean matrix visual; and add Thinklet tools for reading Drive folders, PDFs, spreadsheets, websites, and notes into structured diligence summaries when connected.' },
  { id: 'academic-literature-map', label: '🎓 Literature Map Studio', icon: GraduationCapIcon, audience: 'Research & Intelligence', category: 'Knowledge Work', prompt: 'Create an academic literature map scene: research a topic, build an HTML evidence map with key papers, methods, findings, limitations, citation clusters, open questions, and recommended reading sequence; generate a concept-map image; and add Thinklet tools for summarizing PDFs, extracting claims, building flashcards, and exporting annotated notes to Docs or Notion when connected.' },

  // ── Personal Operators ──
  { id: 'personal-command-center', label: '📅 Personal Command Center', icon: CalendarIcon, audience: 'Personal Operators', category: 'Life OS', prompt: 'Create a personal command center scene: build an HTML life dashboard with today plan, priorities, calendar, inbox, notes, energy, habits, errands, and weekly review; generate a calming personal wallpaper image; and add Thinklet tools for turning rough notes into tasks, emails, calendar blocks, grocery lists, and planning docs using Gmail, Calendar, Todoist-style tasks, Notion, and Google Docs when connected.' },
  { id: 'learning-sprint-studio', label: '📚 Learning Sprint Studio', icon: BookOpenIcon, audience: 'Personal Operators', category: 'Learning', prompt: 'Create a learning sprint scene: build an HTML study dashboard with goals, syllabus, source library, daily drills, quiz cards, progress streak, and project milestones; generate a subject-themed visual; and add Thinklet tools for summarizing videos/articles/PDFs, creating flashcards, planning sessions, and exporting notes to Drive, Docs, or Notion when connected.' },
  { id: 'money-health-dashboard', label: '💰 Money Health Dashboard', icon: LineChartIcon, audience: 'Personal Operators', category: 'Finance', prompt: 'Create a personal money health scene: build an HTML dashboard with cash flow, bills, subscriptions, saving goals, debt payoff, investment watchlist, and spending patterns; generate a tasteful finance visual; and add Thinklet tools for importing CSVs, summarizing statements, drafting budget changes, and tracking goals through Sheets, email receipts, and finance APIs when connected.' },
  { id: 'travel-life-planner', label: '✈️ Travel Life Planner', icon: GlobeIcon, audience: 'Personal Operators', category: 'Planning', prompt: 'Create a travel planning scene: research a destination, build an HTML trip room with itinerary, map-style sections, budget, packing list, reservations, local gems, weather, transit, and emergency info; generate destination imagery; create a short travel mood video prompt; and add Thinklet tools for organizing confirmations from Gmail, Calendar events, Drive docs, and Sheets when connected.' },
  { id: 'wellness-recovery-room', label: '💪 Wellness Recovery Room', icon: HeartIcon, audience: 'Personal Operators', category: 'Wellness', prompt: 'Create a wellness recovery scene: build an HTML dashboard with sleep, workouts, meals, mobility, stress, recovery score, symptoms, and weekly reflections; generate a gentle wellness visual; and add Thinklet tools for turning notes into plans, summarizing wearable exports or CSVs, planning meals, and creating habit nudges through Calendar, email, and Sheets when connected.' },

  // ── Advanced AI Workspaces ──
  { id: 'agentic-api-control-tower', label: '🧬 API Control Tower', icon: CircuitBoardIcon, audience: 'Enterprise Ops', category: 'AI Operations', prompt: 'Create an agentic API control tower scene: build an HTML systems dashboard showing connected APIs, available actions, agent routes, permission boundaries, run history, error states, and approval gates; generate a technical architecture image; and add Thinklet tools for testing API actions, writing automation plans, creating rollback steps, and documenting every agent decision.' },
  { id: 'commerce-merchandising-room', label: '🛍️ Commerce Merchandising Room', icon: ShoppingBagIcon, audience: 'Founders & Growth', category: 'Commerce', prompt: 'Create an ecommerce merchandising scene: research category trends, build an HTML merchandising cockpit with product performance, inventory, bundles, promotional calendar, ad creative needs, and customer review themes; generate product lifestyle images; and add Thinklet tools that can pull Shopify-style orders, Stripe revenue, Google Sheets inventory, support tickets, and marketing emails when connected.' },
];

export const DESKTOP_COMBO_PROMPTS = [
  ...THINKLET_DEFAULT_PROMPTS.map(scene => withSceneWorkspaceContext({
    audience: THINKLET_SCENES_AUDIENCE,
    ...scene,
  })),
  ...PROFESSIONAL_SCENE_PROMPTS.map(withSceneWorkspaceContext),
];
