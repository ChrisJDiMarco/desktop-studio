import { useEffect, useRef, useState } from "react";
import { colors } from "@desktop-studio/design";
import type { Config } from "../preload";

// ============== NAVIGATION ==============
// Web's pill menu has two top-level sections: Tools (15 sub-items) and Jobs.
// Settings is Mac-specific. Anything deeper goes through `navigate()`.

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

const TOP_LEVEL: Array<{ id: View; label: string }> = [
  { id: "tools", label: "Tools" },
  { id: "jobs", label: "Jobs" },
  { id: "settings", label: "Settings" },
];

// Order matches desktop-mode.jsx Tools dropdown (14334–14591).
type ToolItem = {
  id: ToolId;
  label: string;
  description: string;
  // True for items that mutate state inline rather than navigating.
  inline?: boolean;
};

const TOOL_ITEMS: ToolItem[] = [
  {
    id: "prompt-history",
    label: "Prompt History",
    description: "Recent prompts, newest first. Click any to refill the pill.",
  },
  {
    id: "data-bus",
    label: "Data Bus Monitor",
    description: "Real-time inspector for cross-artifact pub/sub events.",
  },
  {
    id: "automation-studio",
    label: "Automation Studio",
    description: "Visual builder for chaining artifacts into automations.",
  },
  {
    id: "artifact-switcher",
    label: "Artifact Switcher",
    description: "Quick switch between open artifact windows (⌘J on web).",
  },
  {
    id: "workspace-health",
    label: "Workspace Health",
    description: "Validation + lint surface for current artifacts.",
  },
  {
    id: "workspace-snapshots",
    label: "Workspace Snapshots",
    description: "Save and restore the entire canvas state.",
  },
  {
    id: "brand-prompt",
    label: "Brand Prompt",
    description: "Persistent brand / project context injected into every call.",
  },
  {
    id: "project-rules",
    label: "Project Rules",
    description: "Hard requirements appended to every generation prompt.",
  },
  {
    id: "design-systems",
    label: "Design Systems",
    description: "Manage and activate per-project design system overrides.",
  },
  {
    id: "templates",
    label: "Templates",
    description: "Pre-built Composio-powered Thinklets you can remix.",
  },
  {
    id: "connected-apps",
    label: "Connected Apps",
    description: "OAuth integrations via Composio (Gmail, Slack, Notion, …).",
  },
  {
    id: "critic-mode",
    label: "Critic Mode",
    description: "Wrap auto-improve passes with design-quality scoring.",
  },
  {
    id: "tidy-up",
    label: "Tidy Up",
    description: "Auto-arrange open artifact windows.",
    inline: true,
  },
  {
    id: "bento-arrange",
    label: "Bento Arrange",
    description: "Pack artifact windows into a bento grid.",
    inline: true,
  },
  {
    id: "focus-mode",
    label: "Focus Mode",
    description: "Fullscreen the most recently opened artifact.",
  },
];

function viewParent(v: View): View | null {
  if (v === "menu") return null;
  if (v === "tools" || v === "jobs" || v === "settings") return "menu";
  // tool items hang off "tools"
  return "tools";
}

const TOOL_TITLES: Record<View, string> = {
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
  "templates": "Templates",
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
            <MenuList items={TOP_LEVEL} onSelect={navigate} />
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
        <span className="drawer-title">{TOOL_TITLES[view]}</span>
      </header>
      <div className="drawer-body">
        {view === "tools" && (
          <ToolsList
            items={TOOL_ITEMS}
            config={config}
            onSelect={(item) => {
              if (item.id === "tidy-up" || item.id === "bento-arrange") {
                // Stub action — would dispatch to main process to rearrange
                // artifact windows. Phase 6 wires this up.
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
        {view === "settings" && <SettingsDrawer config={config} patchConfig={patchConfig} />}

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
            description={
              "Wrap each auto-improve pass with a design-quality scoring step. Slower but pushes artifacts closer to a polished final form. Mirrors web's desktop-mode.jsx:14539."
            }
            on={!!config?.criticMode}
            onChange={(v) => patchConfig({ criticMode: v })}
          />
        )}
        {view === "focus-mode" && (
          <ToggleDrawer
            label="Focus Mode"
            description={
              "Fullscreen the most recently opened artifact and dim the rest. Setting persists across launches; the windowing behavior on Mac wires up in a follow-up commit."
            }
            on={!!config?.focusMode}
            onChange={(v) => patchConfig({ focusMode: v })}
          />
        )}

        {/* Stub drawers — keep in sync with TOOL_ITEMS descriptions. */}
        {view === "data-bus" && <ComingSoon item="data-bus" />}
        {view === "automation-studio" && <ComingSoon item="automation-studio" />}
        {view === "artifact-switcher" && <ComingSoon item="artifact-switcher" />}
        {view === "workspace-health" && <ComingSoon item="workspace-health" />}
        {view === "workspace-snapshots" && <ComingSoon item="workspace-snapshots" />}
        {view === "project-rules" && <ComingSoon item="project-rules" />}
        {view === "design-systems" && <ComingSoon item="design-systems" />}
        {view === "templates" && <ComingSoon item="templates" />}
        {view === "connected-apps" && <ComingSoon item="connected-apps" />}
      </div>
    </div>
  );
}

// ============== LIST COMPONENTS ==============

function MenuList({
  items,
  onSelect,
}: {
  items: Array<{ id: View; label: string }>;
  onSelect: (id: View) => void;
}) {
  return (
    <div className="popup-list">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className="popup-item"
          onClick={() => onSelect(item.id)}
        >
          <span>{item.label}</span>
          <Chevron direction="right" muted />
        </button>
      ))}
    </div>
  );
}

function ToolsList({
  items,
  config,
  onSelect,
  onToggle,
}: {
  items: ToolItem[];
  config: Config | null;
  onSelect: (item: ToolItem) => void;
  onToggle: (item: ToolItem) => void;
}) {
  return (
    <div className="popup-list popup-list-dense">
      {items.map((item) => {
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
            className="popup-item popup-item-twoline"
            onClick={() => onSelect(item)}
          >
            <div className="popup-item-text">
              <span className="popup-item-label">{item.label}</span>
              <span className="popup-item-sub">{item.description}</span>
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
              <span className="chip">Run</span>
            ) : (
              <Chevron direction="right" muted />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============== INDIVIDUAL DRAWERS ==============

function ComingSoon({ item }: { item: ToolId }) {
  const meta = TOOL_ITEMS.find((t) => t.id === item);
  return (
    <div className="coming-soon">
      <div className="coming-soon-eyebrow">Coming soon</div>
      <div className="coming-soon-title">{meta?.label}</div>
      <p className="coming-soon-desc">{meta?.description}</p>
      <p className="coming-soon-hint">
        This view ships with the next chunk that ports{" "}
        <code>{TOOL_ITEMS.find((t) => t.id === item)?.id}</code> from
        apps/web/components/desktop-mode.jsx. The button is here today so the
        Mac menu structure stays in lockstep with the web Tools dropdown.
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
  // Placeholder mock data — wires up to the main process queue when the
  // generation pipeline grows multi-job tracking.
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

  useEffect(() => {
    if (config) {
      setBackendUrl(config.backendUrl);
      setModel(config.model);
    }
  }, [config]);

  async function save() {
    setStatus("saving");
    setErrorText("");
    try {
      const next = await patchConfig({ backendUrl, model });
      setBackendUrl(next.backendUrl);
      setModel(next.model);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1400);
    } catch (e: unknown) {
      setErrorText(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  return (
    <div className="settings">
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
