import { useEffect, useState } from "react";

function readPromptFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return decodeURIComponent(params.get("artifact") ?? "");
}

export default function ArtifactApp() {
  const [prompt] = useState(readPromptFromHash);
  const [phase, setPhase] = useState<"thinking" | "ready">("thinking");

  // Phase 4 wires this to the real backend; for now, fake a "Building…"
  // → "Ready" transition so the spawn flow feels alive.
  useEffect(() => {
    const timer = setTimeout(() => setPhase("ready"), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="artifact">
      <header className="artifact-titlebar">
        <span className="artifact-eyebrow">Artifact</span>
        <span className="artifact-title">{prompt || "Untitled"}</span>
      </header>
      <div className="artifact-body">
        <div className={"artifact-status artifact-status-" + phase}>
          <span className="artifact-status-dot" />
          <span>{phase === "thinking" ? "Building…" : "Ready"}</span>
        </div>

        <h1 className="artifact-prompt">{prompt}</h1>

        <p className="artifact-note">
          You spawned an artifact window. The full generation pipeline plugs in
          during Phase 4 of the rollout — from this point on, the renderer is
          the same shared bundle the pill uses, just routed by the
          <code> #artifact=</code> URL hash.
        </p>

        <div className="artifact-meta">
          <Meta label="Window" value="Independent" />
          <Meta label="Source" value="Pill submit" />
          <Meta label="Bundle" value="@desktop-studio/mac renderer" />
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="artifact-meta-row">
      <span className="artifact-meta-label">{label}</span>
      <span className="artifact-meta-value">{value}</span>
    </div>
  );
}
