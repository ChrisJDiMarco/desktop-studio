import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Phase = "thinking" | "ready" | "error";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;

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
        const result = await window.desktopStudio.generate({
          prompt,
          model: DEFAULT_MODEL,
          max_tokens: DEFAULT_MAX_TOKENS,
        });
        if (cancelled) return;
        setResponse(result.text ?? "");
        setModel(result.model ?? DEFAULT_MODEL);
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
  }, [prompt]);

  return (
    <div className="artifact">
      <header className="artifact-titlebar">
        <span className="artifact-eyebrow">Thinklet</span>
        <span className="artifact-title">{prompt || "Untitled"}</span>
      </header>

      <div className="artifact-body">
        <StatusRow phase={phase} elapsed={elapsed} model={model} />

        {phase !== "ready" && (
          <h1 className="artifact-prompt">{prompt}</h1>
        )}

        {phase === "ready" && (
          <div className="artifact-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
          </div>
        )}

        {phase === "error" && (
          <div className="artifact-error">
            <h2>Couldn't generate</h2>
            <pre>{error}</pre>
            <p>
              The Mac app is currently pointing at the local Next.js backend.
              Make sure the web app is running in another terminal:
              {" "}
              <code>pnpm dev:web</code>. Once it's up at{" "}
              <code>localhost:3000</code>, retry by re-submitting from the pill.
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
        {phase === "ready" &&
          (model ? `Ready · ${model}` : "Ready")}
        {phase === "error" && "Error"}
      </span>
    </div>
  );
}
