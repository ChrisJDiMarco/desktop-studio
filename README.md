# Thinklet Desktop

**An open-source AI workspace for building, improving, connecting, and automating living artifacts.**

Thinklet Desktop turns prompts, files, images, research, and connected apps into a spatial desktop full of AI-generated windows: HTML artifacts, Thinklet apps, image/video assets, research dashboards, automation agents, and multi-step creative scenes.

It is built for people who do not want another linear chat thread. It is for builders who want to see their ideas become objects they can move, inspect, edit, merge, connect, and keep evolving.

> Status: early public release. The core is usable, fast-moving, and intentionally open. Expect sharp edges, ambitious ideas, and a product that is still learning what it wants to become.

## Why Thinklet Exists

Most AI tools still feel like a conversation with attachments.

Thinklet Desktop treats AI output as a workspace:

- Generate a landing page, dashboard, calculator, research brief, image set, or video scene.
- Refine any artifact surgically with CRISPR-style edits instead of regenerating from scratch.
- Drag artifacts around a real desktop, resize them from any corner, minimize them into a dock, and restore them later.
- Connect artifacts into chains and automation workflows.
- Keep persistent project memory, brand direction, design systems, rules, snapshots, and versions.
- Bring your own API keys or use a hosted Thinklet workspace when you want the easy path.

The long-term goal is simple: **make an AI desktop where creative work, software prototyping, research, and automation all feel like one native environment.**

## What You Can Build

Thinklet Desktop can create and manage:

- **HTML artifacts**: single-file websites, dashboards, tools, calculators, reports, and demos.
- **Thinklet apps**: React micro-apps with state, controls, and live behavior.
- **AI image artifacts**: generated imagery, moodboards, product visuals, and visual references.
- **AI video artifacts**: short generated motion assets and immersive backgrounds.
- **Research artifacts**: source-backed briefs, dashboards, summaries, and trend reports.
- **Automation agents**: connected Thinklets that pass data through the desktop bus.
- **Multi-step scenes**: pipelines that research, generate media, and build final artifacts.

## Highlights

- **Spatial desktop UI**
  Move, resize, minimize, focus, arrange, and manage generated windows like a real workspace.

- **CRISPR editing**
  Ask for precise changes to an existing artifact. Thinklet applies targeted find/replace patches with validation and history.

- **Staged artifact preview**
  Loading windows show progressive build phases, job progress, and live narration instead of a blank spinner.

- **Workspace memory**
  Store persistent product intent, audience, taste, constraints, and decisions. This context is injected into future builds and edits.

- **Design systems and project rules**
  Define reusable visual language, hard requirements, brand direction, and AI critic behavior.

- **Multimodal drop zone**
  Drop files, screenshots, images, documents, URLs, and text into the desktop to add them as prompt context.

- **Automation Studio**
  Build agent chains, inspect bus events, run automation workflows, and connect artifacts together.

- **Relationships panel**
  See how windows, chains, bus keys, and automations relate to each other.

- **Snapshots and versions**
  Save workspace restore points and per-artifact versions so experimentation stays reversible.

- **BYOK by design**
  Use your own API keys for Anthropic, OpenAI, Gemini, Perplexity, DeepSeek, FAL, and Composio.

## Hosted and Self-Hosted

Thinklet is designed to support two paths:

### Self-hosted

Run the open-source app locally or on your own infrastructure. You bring your own API keys and control your data.

### Hosted

Use the managed version at **app.thinklet.io** when you want sync, storage, hosted infrastructure, team features, managed automations, and fewer setup steps.

The hosted version can support both:

- **BYOK mode**: connect your own model/provider keys.
- **Thinklet-managed mode**: use Thinklet-provided model credits and hosted services.

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/ChrisJDiMarco/desktop-studio.git
cd desktop-studio
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env.local
```

Add the provider keys you want to use. You do not need every key to run the app, but specific generation modes need their matching provider.

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Used for | Required |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Claude generation, analysis, and artifact building | Recommended |
| `OPENAI_API_KEY` | OpenAI-compatible generation paths | Optional |
| `GEMINI_API_KEY` | Image generation routes | Optional |
| `PERPLEXITY_API_KEY` | Research/search flows | Optional |
| `DEEPSEEK_API_KEY` | DeepSeek model routes | Optional |
| `FAL_KEY` / `FAL_API_KEY` / `FAL_API_TOKEN` | Video generation | Optional |
| `FAL_VIDEO_MODEL` | Override the default FAL video model | Optional |
| `FAL_END_USER_ID` | FAL user attribution | Optional |
| `COMPOSIO_API_KEY` | Connected-app auth, tool discovery, and automation actions | Optional |

Never commit `.env.local`. It is ignored by default.

## Development

```bash
npm run dev
npm run lint
npm run build
```

This project currently uses:

- Next.js 16
- React 19
- Tailwind CSS 4
- Framer Motion
- Lucide icons
- Anthropic, OpenAI, Gemini, Perplexity, DeepSeek, FAL, and Composio integrations
- IndexedDB/localStorage-backed workspace persistence

## Architecture

The app is intentionally compact, but these are the main areas:

```text
app/
  api/                      Provider and automation API routes
  page.tsx                  Local workspace persistence shell

components/
  desktop-mode.jsx          Main desktop workspace, artifact windows, toolbar, modals
  desktop/
    artifact-runtime.js     Runtime injection and iframe helpers
    artifact-utils.js       HTML parsing, CRISPR patches, validation, prompt utilities
    automation-studio-*     Automation graph and agent workflow UI
    job-center.jsx          Job progress, logs, cancellation
    workspace-magic.jsx     Snapshots, health, switcher, focus mode

lib/
  artifact-db.js            IndexedDB serialization and hydration
  ai-models.ts              Model registry and defaults
  composio-templates.js     Connected-app starter templates
  tql.ts                    Tiny update operation helper

services/
  api/ai.ts                 Client-side API wrapper
```

## Product Philosophy

Thinklet should feel:

- **Spatial**: ideas become objects, not chat bubbles.
- **Approachable**: powerful without looking like an IDE unless the user asks for depth.
- **Reversible**: every risky creative move should have history, snapshots, or versions.
- **Composable**: artifacts should be connectable, mergeable, forkable, and automatable.
- **Open**: serious users should be able to inspect, self-host, and bring their own keys.

## Roadmap

Short-term:

- Sharpen first-run onboarding and examples.
- Improve artifact sharing/export.
- Add richer templates for founders, agencies, and internal tools.
- Harden CRISPR editing across more HTML/React edge cases.
- Improve automation scheduling and run history.

Medium-term:

- Hosted sync at `app.thinklet.io`.
- Team workspaces and shared project memory.
- Public artifact links and embeddable demos.
- Plugin marketplace for scenes, tools, providers, and templates.
- Better import/export between local, hosted, and desktop shells.

Long-term:

- Native desktop app.
- Multi-user real-time workspaces.
- Durable automations and background agents.
- Versioned artifact graph and dependency-aware rebuilds.
- Deployment targets for artifacts and Thinklet apps.

## Contributing

Contributions are welcome.

The best early contributions are:

- Bug reports with screenshots or reproduction steps.
- New starter scenes/templates.
- Provider integrations.
- Artifact rendering fixes.
- CRISPR patch reliability improvements.
- UI polish for desktop workflows.
- Documentation for self-hosting and deployment.

Please keep pull requests focused. This app moves quickly, so small, clear patches are much easier to review.

## Security

Do not put real secrets in issues, pull requests, screenshots, or example files.

If you discover a security issue, please avoid public disclosure until there is a safe fix path. For now, open a private GitHub security advisory if available, or contact the maintainer directly.

## License

MIT License. See [LICENSE](./LICENSE).

## Maintainer

Created and maintained by [Chris DiMarco](https://github.com/ChrisJDiMarco).

Thinklet Desktop is built in public because the best version of this product should be shaped by the builders who actually want to use it.
