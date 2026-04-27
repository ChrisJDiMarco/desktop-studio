import { useEffect, useRef, useState, type ReactNode } from "react";
import { colors } from "@desktop-studio/design";

// Inline Config type — mirrors src/preload/index.ts to avoid a cross-Vite-
// build type import (preload + renderer are separate Forge bundles).
type Config = {
  backendUrl: string;
  model: string;
  brandPrompt: string;
  criticMode: boolean;
  focusMode: boolean;
  promptHistory: string[];
};

// ============== NAVIGATION ==============

type ToolId =
  | "prompt-history"
  | "data-bus"
  | "automation-studio"
  | "artifact-switcher"
  | "workspace-health"
  | "workspace-snapshots"
  | "brand-prompt"
  | "project-rules"
  | "design-systems"
  | "templates"
  | "connected-apps"
  | "critic-mode"
  | "tidy-up"
  | "bento-arrange"
  | "focus-mode";

type View = "menu" | "tools" | "jobs" | "settings" | ToolId;

const TOP_LEVEL: Array<{ id: View; label: string; icon: IconName; description: string }> = [
  {
    id: "tools",
    label: "Tools",
    icon: "sliders",
    description: "Workspace, project, and AI controls",
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: "activity",
    description: "Active and recent generation jobs",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    description: "Backend URL and default model",
  },
];

type ToolItem = {
  id: ToolId;
  label: string;
  description: string;
  icon: IconName;
  inline?: boolean;
};

type ToolSection = {
  id: string;
  label: string;
  items: ToolItem[];
};

// Order within sections preserves web's overall priority but groups for
// browsability. Web's flat list is at desktop-mode.jsx:14334–14591.
const TOOL_SECTIONS: ToolSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "tidy-up",
        label: "Tidy Up",
        description: "Auto-arrange open artifact windows.",
        icon: "wind",
        inline: true,
      },
      {
        id: "bento-arrange",
        label: "Bento Arrange",
        description: "Pack artifact windows into a bento grid.",
        icon: "grid",
        inline: true,
      },
      {
        id: "focus-mode",
        label: "Focus Mode",
        description: "Fullscreen the most recently opened artifact.",
        icon: "eye",
      },
      {
        id: "workspace-health",
        label: "Workspace Health",
        description: "Validation + lint surface for current artifacts.",
        icon: "shield",
      },
      {
        id: "workspace-snapshots",
        label: "Workspace Snapshots",
        description: "Save and restore the entire canvas state.",
        icon: "camera",
      },
      {
        id: "artifact-switcher",
        label: "Artifact Switcher",
        description: "Quick switch between open artifact windows (⌘J on web).",
        icon: "search",
      },
    ],
  },
  {
    id: "project",
    label: "Project",
    items: [
      {
        id: "brand-prompt",
        label: "Brand Prompt",
        description: "Persistent brand / project context injected into every call.",
        icon: "file-text",
      },
      {
        id: "project-rules",
        label: "Project Rules",
        description: "Hard requirements appended to every generation prompt.",
        icon: "bookmark",
      },
      {
        id: "design-systems",
        label: "Design Systems",
        description: "Manage and activate per-project design system overrides.",
        icon: "palette",
      },
      {
        id: "critic-mode",
        label: "Critic Mode",
        description: "Wrap auto-improve passes with design-quality scoring.",
        icon: "flask",
      },
    ],
  },
  {
    id: "library",
    label: "Library",
    items: [
      {
        id: "templates",
        label: "Templates",
        description: "Pre-built Composio-powered Thinklets you can remix.",
        icon: "sparkles",
      },
      {
        id: "connected-apps",
        label: "Connected Apps",
        description: "OAuth integrations via Composio (Gmail, Slack, Notion, …).",
        icon: "zap",
      },
      {
        id: "automation-studio",
        label: "Automation Studio",
        description: "Visual builder for chaining artifacts into automations.",
        icon: "git-branch",
      },
    ],
  },
  {
    id: "activity",
    label: "Activity",
    items: [
      {
        id: "prompt-history",
        label: "Prompt History",
        description: "Recent prompts, newest first. Click any to refill the pill.",
        icon: "clock",
      },
      {
        id: "data-bus",
        label: "Data Bus Monitor",
        description: "Real-time inspector for cross-artifact pub/sub events.",
        icon: "broadcast",
      },
    ],
  },
];

const ALL_TOOL_ITEMS: ToolItem[] = TOOL_SECTIONS.flatMap((s) => s.items);

function findTool(id: ToolId): ToolItem | undefined {
  return ALL_TOOL_ITEMS.find((t) => t.id === id);
}

function viewParent(v: View): View | null {
  if (v === "menu") return null;
  if (v === "tools" || v === "jobs" || v === "settings") return "menu";
  return "tools";
}

const VIEW_TITLES: Record<View, string> = {
  menu: "Menu",
  tools: "Tools",
  jobs: "Jobs",
  settings: "Settings",
  "prompt-history": "Prompt History",
  "data-bus": "Data Bus Monitor",
  "automation-studio": "Automation Studio",
  "artifact-switcher": "Artifact Switcher",
  "workspace-health": "Workspace Health",
  "workspace-snapshots": "Workspace Snapshots",
  "brand-prompt": "Brand Prompt",
  "project-rules": "Project Rules",
  "design-systems": "Design Systems",
  templates: "Templates",
  "connected-apps": "Connected Apps",
  "critic-mode": "Critic Mode",
  "tidy-up": "Tidy Up",
  "bento-arrange": "Bento Arrange",
  "focus-mode": "Focus Mode",
};

// ============== APP ==============

export default function PillApp() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [config, setConfig] = useState<Config | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return window.desktopStudio.onFocusInput(() => {
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    window.desktopStudio.setExpanded(open);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    window.desktopStudio.getConfig().then((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function patchConfig(patch: Partial<Config>) {
    const next = await window.desktopStudio.setConfig(patch);
    setConfig(next);
    return next;
  }

  function closeAndFocus() {
    setOpen(false);
    setView("menu");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function navigate(to: View) {
    setView(to);
  }

  function back() {
    const parent = viewParent(view);
    if (parent) setView(parent);
    else closeAndFocus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (open) {
        if (view !== "menu") {
          back();
        } else {
          closeAndFocus();
        }
      } else {
        window.desktopStudio.hidePill();
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const prompt = value.trim();
    if (!prompt) return;
    window.desktopStudio.createArtifact(prompt);
    setValue("");
    if (open) closeAndFocus();
  }

  function handleHistorySelect(prompt: string) {
    setValue(prompt);
    closeAndFocus();
  }

  return (
    <div className="pill-shell">
      {open && (
        <div
          className="popup"
          role="menu"
          onMouseDown={(e) => {
            if (
              e.target instanceof HTMLElement &&
              !["BUTTON", "INPUT", "TEXTAREA", "SELECT", "OPTION", "LABEL"].includes(
                e.target.tagName
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          {view === "menu" ? (
            <TopMenu items={TOP_LEVEL} onSelect={navigate} />
          ) : (
            <Drawer
              view={view}
              onBack={back}
              config={config}
              patchConfig={patchConfig}
              navigate={navigate}
              onHistorySelect={handleHistorySelect}
              closeAndFocus={closeAndFocus}
            />
          )}
        </div>
      )}

      <form className="pill" onSubmit={handleSubmit}>
        <div
          className="pill-status"
          style={{ background: colors.accent }}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          className="pill-input"
          placeholder="Ask for anything... apps, tools, images, notes..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        <button
          type="button"
          className={"pill-trigger" + (open ? " is-open" : "")}
          onClick={() => {
            setView("menu");
            setOpen((v) => !v);
          }}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span>Menu</span>
          <Chevron direction="up" />
        </button>
      </form>
    </div>
  );
}

// ============== NAVIGATION SHELL ==============

function Drawer({
  view,
  onBack,
  config,
  patchConfig,
  navigate,
  onHistorySelect,
  closeAndFocus,
}: {
  view: View;
  onBack: () => void;
  config: Config | null;
  patchConfig: (patch: Partial<Config>) => Promise<Config>;
  navigate: (to: View) => void;
  onHistorySelect: (prompt: string) => void;
  closeAndFocus: () => void;
}) {
  const tool = view !== "menu" && view !== "tools" && view !== "jobs" && view !== "settings"
    ? findTool(view as ToolId)
    : undefined;

  return (
    <div className="drawer">
      <header className="drawer-header">
        <button
          type="button"
          className="drawer-back"
          onClick={onBack}
          aria-label="Back"
        >
          <Chevron direction="left" />
        </button>
        <div className="drawer-header-text">
          <span className="drawer-eyebrow">
            {viewParent(view) === "tools" ? "Tools" : ""}
          </span>
          <span className="drawer-title">{VIEW_TITLES[view]}</span>
        </div>
      </header>
      <div className="drawer-body">
        {view === "tools" && (
          <ToolsList
            sections={TOOL_SECTIONS}
            config={config}
            onSelect={(item) => {
              if (item.id === "tidy-up" || item.id === "bento-arrange") {
                console.log("[pill]", item.id, "(coming soon)");
                closeAndFocus();
                return;
              }
              navigate(item.id);
            }}
            onToggle={async (item) => {
              if (item.id === "critic-mode") {
                await patchConfig({ criticMode: !config?.criticMode });
              } else if (item.id === "focus-mode") {
                await patchConfig({ focusMode: !config?.focusMode });
              }
            }}
          />
        )}

        {view === "jobs" && <JobsDrawer />}
        {view === "settings" && (
          <SettingsDrawer config={config} patchConfig={patchConfig} />
        )}

        {view === "prompt-history" && (
          <PromptHistoryDrawer
            history={config?.promptHistory ?? []}
            onSelect={onHistorySelect}
          />
        )}
        {view === "brand-prompt" && (
          <BrandPromptDrawer
            value={config?.brandPrompt ?? ""}
            patchConfig={patchConfig}
          />
        )}
        {view === "critic-mode" && (
          <ToggleDrawer
            label="Critic Mode"
            description="Wrap each auto-improve pass with a design-quality scoring step. Slower but pushes artifacts closer to a polished final form. Mirrors web's desktop-mode.jsx:14539."
            on={!!config?.criticMode}
            onChange={(v) => patchConfig({ criticMode: v })}
          />
        )}
        {view === "focus-mode" && (
          <ToggleDrawer
            label="Focus Mode"
            description="Fullscreen the most recently opened artifact and dim the rest. Setting persists across launches; the windowing behavior on Mac wires up in a follow-up commit."
            on={!!config?.focusMode}
            onChange={(v) => patchConfig({ focusMode: v })}
          />
        )}

        {view === "data-bus" && tool && <ComingSoon tool={tool} />}
        {view === "automation-studio" && tool && <ComingSoon tool={tool} />}
        {view === "artifact-switcher" && tool && <ComingSoon tool={tool} />}
        {view === "workspace-health" && tool && <ComingSoon tool={tool} />}
        {view === "workspace-snapshots" && tool && <ComingSoon tool={tool} />}
        {view === "project-rules" && tool && <ComingSoon tool={tool} />}
        {view === "design-systems" && tool && <ComingSoon tool={tool} />}
        {view === "templates" && tool && <ComingSoon tool={tool} />}
        {view === "connected-apps" && tool && <ComingSoon tool={tool} />}
      </div>
    </div>
  );
}

// ============== TOP-LEVEL MENU ==============

function TopMenu({
  items,
  onSelect,
}: {
  items: Array<{ id: View; label: string; icon: IconName; description: string }>;
  onSelect: (id: View) => void;
}) {
  return (
    <div className="top-menu">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className="top-menu-item"
          onClick={() => onSelect(item.id)}
        >
          <span className="top-menu-icon">
            <Icon name={item.icon} size={16} />
          </span>
          <div className="top-menu-text">
            <span className="top-menu-label">{item.label}</span>
            <span className="top-menu-sub">{item.description}</span>
          </div>
          <Chevron direction="right" muted />
        </button>
      ))}
    </div>
  );
}

// ============== TOOLS LIST WITH SECTIONS ==============

function ToolsList({
  sections,
  config,
  onSelect,
  onToggle,
}: {
  sections: ToolSection[];
  config: Config | null;
  onSelect: (item: ToolItem) => void;
  onToggle: (item: ToolItem) => void;
}) {
  return (
    <div className="tools-list">
      {sections.map((section) => (
        <section key={section.id} className="tools-section">
          <header className="tools-section-header">{section.label}</header>
          <div className="tools-section-items">
            {section.items.map((item) => {
              const togglable = item.id === "critic-mode" || item.id === "focus-mode";
              const on =
                item.id === "critic-mode"
                  ? !!config?.criticMode
                  : item.id === "focus-mode"
                    ? !!config?.focusMode
                    : false;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className="tools-item"
                  onClick={() => onSelect(item)}
                >
                  <span className="tools-item-icon">
                    <Icon name={item.icon} size={14} />
                  </span>
                  <div className="tools-item-text">
                    <span className="tools-item-label">{item.label}</span>
                    <span className="tools-item-sub">{item.description}</span>
                  </div>
                  {togglable ? (
                    <button
                      type="button"
                      className={"toggle" + (on ? " toggle-on" : "")}
                      role="switch"
                      aria-checked={on}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(item);
                      }}
                      aria-label={`Toggle ${item.label}`}
                    >
                      <span className="toggle-thumb" />
                    </button>
                  ) : item.inline ? (
                    <span className="chip tools-item-chip">Run</span>
                  ) : (
                    <Chevron direction="right" muted />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ============== INDIVIDUAL DRAWERS ==============

function ComingSoon({ tool }: { tool: ToolItem }) {
  return (
    <div className="coming-soon">
      <span className="coming-soon-bubble">
        <Icon name={tool.icon} size={20} />
      </span>
      <div className="coming-soon-eyebrow">Coming soon</div>
      <div className="coming-soon-title">{tool.label}</div>
      <p className="coming-soon-desc">{tool.description}</p>
      <p className="coming-soon-hint">
        This view ships with the next chunk that ports{" "}
        <code>{tool.id}</code> from apps/web/components/desktop-mode.jsx. The
        button is here today so the Mac menu structure stays in lockstep with
        the web Tools dropdown.
      </p>
    </div>
  );
}

function PromptHistoryDrawer({
  history,
  onSelect,
}: {
  history: string[];
  onSelect: (prompt: string) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="coming-soon">
        <span className="coming-soon-bubble">
          <Icon name="clock" size={20} />
        </span>
        <div className="coming-soon-eyebrow">Empty</div>
        <p className="coming-soon-desc">
          Submitted prompts will appear here, newest first. Click any to refill
          the pill input.
        </p>
      </div>
    );
  }
  return (
    <ul className="row-list">
      {history.map((p, i) => (
        <li key={i}>
          <button
            type="button"
            className="history-row"
            onClick={() => onSelect(p)}
            title={p}
          >
            <span className="history-row-text">{p}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BrandPromptDrawer({
  value,
  patchConfig,
}: {
  value: string;
  patchConfig: (patch: Partial<Config>) => Promise<Config>;
}) {
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function save() {
    setStatus("saving");
    await patchConfig({ brandPrompt: draft });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  }

  const dirty = draft !== value;

  return (
    <div className="settings">
      <div className="settings-row">
        <label className="settings-label" htmlFor="brand-prompt-textarea">
          Brand prompt
        </label>
        <textarea
          id="brand-prompt-textarea"
          className="settings-textarea"
          rows={6}
          spellCheck={false}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            "e.g. We're a B2B SaaS for ops teams. Aesthetic: dark, glassmorphic, cyan accent. Tone: confident, technical, no fluff."
          }
        />
        <p className="settings-hint">
          Prepended as system context to every generation. Web's Tools-menu
          equivalent at desktop-mode.jsx:14440.
        </p>
      </div>
      <div className="settings-actions">
        <button
          type="button"
          className="chip chip-on settings-save"
          onClick={save}
          disabled={!dirty || status === "saving"}
        >
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved ✓"
              : "Save"}
        </button>
      </div>
    </div>
  );
}

function ToggleDrawer({
  label,
  description,
  on,
  onChange,
}: {
  label: string;
  description: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="settings">
      <div className="settings-row">
        <label className="settings-label">{label}</label>
        <div className="toggle-row">
          <span className="row-label">{on ? "On" : "Off"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            className={"toggle" + (on ? " toggle-on" : "")}
            onClick={() => onChange(!on)}
            aria-label={`Toggle ${label}`}
          >
            <span className="toggle-thumb" />
          </button>
        </div>
        <p className="settings-hint">{description}</p>
      </div>
    </div>
  );
}

function JobsDrawer() {
  const jobs = [
    { id: "1", name: "Email summary", status: "done" as const, when: "5m ago" },
    {
      id: "2",
      name: "Pizza landing page",
      status: "running" as const,
      when: "now",
    },
    { id: "3", name: "Slack bot scaffold", status: "failed" as const, when: "1h ago" },
  ];
  return (
    <ul className="row-list">
      {jobs.map((j) => (
        <li key={j.id} className="row">
          <span className="row-label">{j.name}</span>
          <span className={"job-status job-" + j.status}>
            <span className="job-dot" />
            <span>
              {j.status === "running"
                ? "Running"
                : j.status === "done"
                  ? "Done"
                  : "Failed"}
            </span>
            <span className="job-when">{j.when}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const MODEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { value: "gpt-4o", label: "GPT-4o (OpenAI)" },
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "sonar-pro", label: "Sonar Pro (Perplexity)" },
];

type PingState =
  | { kind: "idle" }
  | { kind: "pinging" }
  | { kind: "ok"; latencyMs: number; status: number }
  | { kind: "fail"; error: string };

function SettingsDrawer({
  config,
  patchConfig,
}: {
  config: Config | null;
  patchConfig: (patch: Partial<Config>) => Promise<Config>;
}) {
  const [backendUrl, setBackendUrl] = useState(config?.backendUrl ?? "");
  const [model, setModel] = useState(config?.model ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [errorText, setErrorText] = useState("");
  const [ping, setPing] = useState<PingState>({ kind: "idle" });

  useEffect(() => {
    if (config) {
      setBackendUrl(config.backendUrl);
      setModel(config.model);
    }
  }, [config]);

  async function probeBackend(url: string) {
    if (!url.trim()) return;
    setPing({ kind: "pinging" });
    try {
      const r = await window.desktopStudio.pingBackend(url);
      if (r.ok) {
        setPing({
          kind: "ok",
          latencyMs: r.latencyMs ?? 0,
          status: r.status ?? 0,
        });
      } else {
        setPing({ kind: "fail", error: r.error ?? "Unreachable" });
      }
    } catch (e: unknown) {
      setPing({
        kind: "fail",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Probe on mount + whenever the saved URL changes (after Save).
  useEffect(() => {
    if (config?.backendUrl) probeBackend(config.backendUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.backendUrl]);

  async function save() {
    setStatus("saving");
    setErrorText("");
    try {
      const next = await patchConfig({ backendUrl, model });
      setBackendUrl(next.backendUrl);
      setModel(next.model);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1400);
      // probeBackend gets called by the effect above when config updates.
    } catch (e: unknown) {
      setErrorText(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  const pingClassName =
    ping.kind === "ok"
      ? "backend-status backend-status-ok"
      : ping.kind === "fail"
        ? "backend-status backend-status-fail"
        : "backend-status backend-status-pinging";

  const pingLabel =
    ping.kind === "pinging"
      ? "Checking…"
      : ping.kind === "ok"
        ? `Connected · ${ping.latencyMs}ms`
        : ping.kind === "fail"
          ? "Unreachable"
          : "—";

  return (
    <div className="settings">
      <div className={pingClassName}>
        <span className="backend-status-dot" />
        <span className="backend-status-label">{pingLabel}</span>
        {ping.kind === "fail" && (
          <button
            type="button"
            className="backend-status-retry"
            onClick={() => probeBackend(config?.backendUrl ?? backendUrl)}
            title="Re-check"
          >
            Retry
          </button>
        )}
      </div>
      {ping.kind === "fail" && (
        <p className="backend-status-detail" title={ping.error}>
          {ping.error}
        </p>
      )}

      <div className="settings-row">
        <label className="settings-label" htmlFor="backend-url">
          Backend URL
        </label>
        <input
          id="backend-url"
          type="text"
          className="settings-input"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          placeholder="http://localhost:3000"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <p className="settings-hint">
          Where the Mac app sends generation requests. Defaults to your local
          Next.js dev server. Will eventually point to{" "}
          <code>https://app.thinklet.io</code>.
        </p>
      </div>

      <div className="settings-row">
        <label className="settings-label" htmlFor="default-model">
          Default model
        </label>
        <select
          id="default-model"
          className="settings-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {!MODEL_OPTIONS.some((o) => o.value === model) && model && (
            <option value={model}>{model} (custom)</option>
          )}
        </select>
        <p className="settings-hint">
          Used for new artifact windows. /api/generate routes by name prefix
          (claude-*, gpt-*, deepseek-*, sonar*).
        </p>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="chip chip-on settings-save"
          onClick={save}
          disabled={status === "saving"}
        >
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved ✓"
              : "Save"}
        </button>
        {status === "error" && (
          <span className="settings-error" title={errorText}>
            Error
          </span>
        )}
      </div>
    </div>
  );
}

// ============== ICONS ==============

type IconName =
  | "clock"
  | "broadcast"
  | "git-branch"
  | "search"
  | "shield"
  | "camera"
  | "file-text"
  | "bookmark"
  | "palette"
  | "sparkles"
  | "zap"
  | "flask"
  | "wind"
  | "grid"
  | "eye"
  | "sliders"
  | "activity"
  | "settings";

const ICONS: Record<IconName, ReactNode> = {
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  broadcast: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
    </>
  ),
  "git-branch": (
    <>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  "file-text": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  palette: (
    <>
      <circle cx="13.5" cy="6.5" r=".75" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".75" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".75" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".75" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.83-.44-1.13-.29-.29-.44-.65-.44-1.12a1.64 1.64 0 0 1 1.67-1.67h1.99c3.05 0 5.55-2.5 5.55-5.55C21.96 6.01 17.46 2 12 2z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.95-6.95-2.12 2.12m-9.66 9.66L5.05 18.95m13.9 0-2.12-2.12m-9.66-9.66L5.05 5.05" />
      <path d="M12 8.5l1.5 3 3 1.5-3 1.5L12 17.5l-1.5-3-3-1.5 3-1.5L12 8.5z" />
    </>
  ),
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  flask: (
    <path d="M9 2h6m-3 0v7.5L4.5 18a2 2 0 0 0 1.732 3h11.536a2 2 0 0 0 1.732-3L12 9.5" />
  ),
  wind: (
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sliders: (
    <>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </>
  ),
  activity: (
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
};

function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

// ============== ATOMS ==============

function Chevron({
  direction,
  muted,
}: {
  direction: "up" | "down" | "left" | "right";
  muted?: boolean;
}) {
  const d =
    direction === "up"
      ? "M2 6.5L5 3.5L8 6.5"
      : direction === "down"
        ? "M2 3.5L5 6.5L8 3.5"
        : direction === "left"
          ? "M6.5 2L3.5 5L6.5 8"
          : "M3.5 2L6.5 5L3.5 8";
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden
      style={muted ? { color: "rgba(255,255,255,0.4)" } : undefined}
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
