import { useEffect, useMemo, useState } from "react";
import {
  detectHtmlArtifactType,
  buildHtmlArtifactPrompt,
  type HtmlArtifactType,
} from "@desktop-studio/core";
import { ArtifactRenderer } from "./ArtifactRenderer";

type Phase = "thinking" | "ready" | "error";

const DEFAULT_MODEL = "claude-sonnet-4-6";
// Web uses 64000; matching it so apps/mac generates artifacts at the same
// quality bar (apps/web/components/desktop-mode.jsx:9883).
const DEFAULT_MAX_TOKENS = 64_000;

function readPromptFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return decodeURIComponent(params.get("artifact") ?? "");
}

export default function ArtifactApp() {
  const [prompt] = useState(readPromptFromHash);
  const [phase, setPhase] = useState<Phase>("thinking");
  const [response, setResponse] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useMemo(() => Date.now(), []);

  const typeInfo: HtmlArtifactType = useMemo(
    () => detectHtmlArtifactType(prompt || ""),
    [prompt]
  );

  // Tick the elapsed counter while we're waiting on Claude.
  useEffect(() => {
    if (phase !== "thinking") return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [phase, startedAt]);

  // Kick off generation on mount.
  useEffect(() => {
    if (!prompt) {
      setPhase("error");
      setError("No prompt was provided to this artifact window.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const config = await window.desktopStudio.getConfig();
        const wrapped = buildHtmlArtifactPrompt(prompt, { typeInfo });
        const result = await window.desktopStudio.generate({
          prompt: wrapped,
          model: config.model || DEFAULT_MODEL,
          max_tokens: DEFAULT_MAX_TOKENS,
        });
        if (cancelled) return;
        setResponse(result.text ?? "");
        setModel(result.model ?? config.model ?? DEFAULT_MODEL);
        setPhase("ready");
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prompt, typeInfo]);

  return (
    <div className="artifact">
      <header className="artifact-titlebar">
        <span className="artifact-eyebrow">{typeInfo.kind}</span>
        <span className="artifact-title">{prompt || "Untitled"}</span>
      </header>

      <div className={"artifact-body" + (phase === "ready" ? " artifact-body-flush" : "")}>
        <StatusRow phase={phase} elapsed={elapsed} model={model} />

        {phase !== "ready" && <h1 className="artifact-prompt">{prompt}</h1>}

        {phase === "ready" && (
          <ArtifactRenderer
            content={response}
            fallbackTitle={prompt.slice(0, 30) || "Untitled"}
            fallbackDims={typeInfo.dims}
          />
        )}

        {phase === "error" && (
          <div className="artifact-error">
            <h2>Couldn't generate</h2>
            <pre>{error}</pre>
            <p>
              The Mac app is currently pointing at the configured backend URL.
              You can change it in the pill's <strong>Settings</strong> drawer.
              For local development, make sure the web app is running with{" "}
              <code>pnpm dev:web</code> at <code>localhost:3000</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  phase,
  elapsed,
  model,
}: {
  phase: Phase;
  elapsed: number;
  model: string;
}) {
  return (
    <div className={"artifact-status artifact-status-" + phase}>
      <span className="artifact-status-dot" />
      <span>
        {phase === "thinking" && `Generating… ${elapsed.toFixed(1)}s`}
        {phase === "ready" && (model ? `Ready · ${model}` : "Ready")}
        {phase === "error" && "Error"}
      </span>
    </div>
  );
}
