import { useState } from "react";
import { colors } from "@desktop-studio/design";

const DRAWER_BUTTONS = ["Tools", "Connect", "Auto", "Jobs"] as const;

export default function App() {
  const [value, setValue] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      window.desktopStudio.hidePill();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    // Phase 3 wires this to the backend → spawns artifact windows.
    console.log("[pill] submit:", value);
    setValue("");
  }

  return (
    <form className="pill" onSubmit={handleSubmit}>
      <div className="pill-status" style={{ background: colors.accent }} />
      <input
        type="text"
        className="pill-input"
        autoFocus
        placeholder="Ask anything…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
      <div className="pill-actions">
        {DRAWER_BUTTONS.map((label) => (
          <button key={label} type="button" className="pill-btn">
            {label}
          </button>
        ))}
      </div>
    </form>
  );
}
