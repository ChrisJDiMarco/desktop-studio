import { useEffect, useRef, useState } from "react";
import { colors } from "@desktop-studio/design";

type MenuItem = { id: string; label: string };

const MENU_ITEMS: MenuItem[] = [
  { id: "tools", label: "Tools" },
  { id: "connect", label: "Connections" },
  { id: "auto", label: "Automations" },
  { id: "jobs", label: "Jobs" },
];

export default function App() {
  const [value, setValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount and whenever main asks us to.
  useEffect(() => {
    inputRef.current?.focus();
    return window.desktopStudio.onFocusInput(() => {
      inputRef.current?.focus();
    });
  }, []);

  // Tell main to grow / shrink the window when the menu opens / closes.
  useEffect(() => {
    window.desktopStudio.setExpanded(menuOpen);
  }, [menuOpen]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (menuOpen) {
        setMenuOpen(false);
      } else {
        window.desktopStudio.hidePill();
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    // Phase 3 wires this up to the backend → spawn artifact windows.
    console.log("[pill] submit:", value);
    setValue("");
  }

  function handleMenuItemClick(item: MenuItem) {
    // Phase 2 will route each item to its drawer.
    console.log("[pill] menu:", item.id);
    setMenuOpen(false);
  }

  return (
    <div className="pill-shell">
      {menuOpen && (
        <div
          className="pill-menu"
          role="menu"
          onMouseDown={(e) => e.preventDefault()}
        >
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="pill-menu-item"
              onClick={() => handleMenuItemClick(item)}
            >
              {item.label}
            </button>
          ))}
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
          placeholder="Ask anything…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        <button
          type="button"
          className={"pill-trigger" + (menuOpen ? " is-open" : "")}
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
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
