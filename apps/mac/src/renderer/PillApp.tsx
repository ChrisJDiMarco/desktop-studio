import { useEffect, useRef, useState } from "react";
import { colors } from "@desktop-studio/design";

type View = "menu" | "tools" | "connect" | "auto" | "jobs" | "settings";

type MenuItem = { id: Exclude<View, "menu">; label: string };

const MENU_ITEMS: MenuItem[] = [
  { id: "tools", label: "Tools" },
  { id: "connect", label: "Connections" },
  { id: "auto", label: "Automations" },
  { id: "jobs", label: "Jobs" },
  { id: "settings", label: "Settings" },
];

export default function PillApp() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
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

  function closeAndFocus() {
    setOpen(false);
    setView("menu");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (open) {
        closeAndFocus();
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

  function handleMenuItemClick(item: MenuItem) {
    setView(item.id);
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
              e.target.tagName !== "BUTTON" &&
              e.target.tagName !== "INPUT" &&
              e.target.tagName !== "SELECT" &&
              e.target.tagName !== "OPTION"
            ) {
              e.preventDefault();
            }
          }}
        >
          {view === "menu" ? (
            <MenuList items={MENU_ITEMS} onSelect={handleMenuItemClick} />
          ) : (
            <Drawer view={view} onBack={() => setView("menu")} />
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
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 6.5L5 3.5L8 6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}

function MenuList({
  items,
  onSelect,
}: {
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
}) {
  return (
    <div className="popup-list">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className="popup-item"
          onClick={() => onSelect(item)}
        >
          <span>{item.label}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path
              d="M3.5 2L6.5 5L3.5 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Drawer({
  view,
  onBack,
}: {
  view: Exclude<View, "menu">;
  onBack: () => void;
}) {
  const titles: Record<typeof view, string> = {
    tools: "Tools",
    connect: "Connections",
    auto: "Automations",
    jobs: "Jobs",
    settings: "Settings",
  };

  return (
    <div className="drawer">
      <header className="drawer-header">
        <button
          type="button"
          className="drawer-back"
          onClick={onBack}
          aria-label="Back"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M7.5 2.5L4 6L7.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="drawer-title">{titles[view]}</span>
      </header>
      <div className="drawer-body">
        {view === "tools" && <ToolsDrawer />}
        {view === "connect" && <ConnectDrawer />}
        {view === "auto" && <AutoDrawer />}
        {view === "jobs" && <JobsDrawer />}
        {view === "settings" && <SettingsDrawer />}
      </div>
    </div>
  );
}

function ToolsDrawer() {
  const tools = [
    { id: "search", name: "Web Search", on: true },
    { id: "image", name: "Image Generation", on: true },
    { id: "code", name: "Code Interpreter", on: false },
    { id: "files", name: "File Reader", on: true },
  ];
  return (
    <ul className="row-list">
      {tools.map((t) => (
        <li key={t.id} className="row">
          <span className="row-label">{t.name}</span>
          <Toggle defaultOn={t.on} />
        </li>
      ))}
    </ul>
  );
}

function ConnectDrawer() {
  const services = [
    { id: "slack", name: "Slack", connected: true },
    { id: "gmail", name: "Gmail", connected: false },
    { id: "linkedin", name: "LinkedIn", connected: false },
    { id: "github", name: "GitHub", connected: true },
    { id: "notion", name: "Notion", connected: false },
  ];
  return (
    <ul className="row-list">
      {services.map((s) => (
        <li key={s.id} className="row">
          <span className="row-label">{s.name}</span>
          <button type="button" className={"chip" + (s.connected ? " chip-on" : "")}>
            {s.connected ? "Connected" : "Connect"}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AutoDrawer() {
  const auto = [
    { id: "digest", name: "Daily digest", on: true },
    { id: "report", name: "Weekly report", on: false },
    { id: "tag", name: "Auto-tag emails", on: true },
  ];
  return (
    <ul className="row-list">
      {auto.map((a) => (
        <li key={a.id} className="row">
          <span className="row-label">{a.name}</span>
          <Toggle defaultOn={a.on} />
        </li>
      ))}
    </ul>
  );
}

function JobsDrawer() {
  const jobs = [
    { id: "1", name: "Email summary", status: "done" as const, when: "5m ago" },
    { id: "2", name: "Pizza landing page", status: "running" as const, when: "now" },
    { id: "3", name: "Slack bot scaffold", status: "failed" as const, when: "1h ago" },
  ];
  return (
    <ul className="row-list">
      {jobs.map((j) => (
        <li key={j.id} className="row">
          <span className="row-label">{j.name}</span>
          <span className={"job-status job-" + j.status}>
            <span className="job-dot" />
            <span>{j.status === "running" ? "Running" : j.status === "done" ? "Done" : "Failed"}</span>
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

function SettingsDrawer() {
  const [backendUrl, setBackendUrl] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;
    window.desktopStudio.getConfig().then((cfg) => {
      if (cancelled) return;
      setBackendUrl(cfg.backendUrl);
      setModel(cfg.model);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setStatus("saving");
    setErrorText("");
    try {
      const next = await window.desktopStudio.setConfig({ backendUrl, model });
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

function Toggle({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={"toggle" + (on ? " toggle-on" : "")}
      onClick={() => setOn((v) => !v)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
