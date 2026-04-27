import { useEffect, useMemo, useRef, useState } from "react";
import {
  detectHtmlArtifactType,
  buildHtmlArtifactPrompt,
  buildHtmlArtifactRefinePrompt,
  buildHtmlArtifactAutoImprovePrompt,
  type HtmlArtifactType,
} from "@desktop-studio/core";
import { ArtifactRenderer } from "./ArtifactRenderer";

type Phase = "thinking" | "ready" | "refining" | "error";

const DEFAULT_MODEL = "claude-sonnet-4-6";
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
  const [refineInput, setRefineInput] = useState("");
  const [priorInstructions, setPriorInstructions] = useState<string[]>([]);
  const startedAt = useRef(Date.now());

  const typeInfo: HtmlArtifactType = useMemo(
    () => detectHtmlArtifactType(prompt || ""),
    [prompt]
  );

  const isWorking = phase === "thinking" || phase === "refining";

  // Tick the elapsed counter while we're waiting on Claude.
  useEffect(() => {
    if (!isWorking) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - startedAt.current) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [isWorking]);

  // Kick off initial generation on mount.
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
        const wrapped = buildHtmlArtifactPrompt(prompt, {
          typeInfo,
          systemContext: config.brandPrompt
            ? `BRAND CONTEXT:\n${config.brandPrompt}\n\n`
            : "",
        });
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

  async function runRefine(instruction: string) {
    if (!instruction.trim() || isWorking) return;
    const trimmed = instruction.trim();

    startedAt.current = Date.now();
    setElapsed(0);
    setPhase("refining");
    setError("");

    try {
      const config = await window.desktopStudio.getConfig();
      const wrapped = buildHtmlArtifactRefinePrompt(response, trimmed, {
        systemContext: config.brandPrompt
          ? `BRAND CONTEXT:\n${config.brandPrompt}\n\n`
          : "",
        priorInstructions,
      });
      const result = await window.desktopStudio.generate({
        prompt: wrapped,
        model: config.model || model || DEFAULT_MODEL,
        max_tokens: DEFAULT_MAX_TOKENS,
      });
      setResponse(result.text ?? "");
      setModel(result.model ?? config.model ?? model);
      setPriorInstructions((prev) => [...prev, trimmed]);
      setRefineInput("");
      setPhase("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  async function runAutoImprove() {
    if (isWorking || !response) return;
    startedAt.current = Date.now();
    setElapsed(0);
    setPhase("refining");
    setError("");

    try {
      const config = await window.desktopStudio.getConfig();
      const wrapped = buildHtmlArtifactAutoImprovePrompt(response, {
        systemContext: config.brandPrompt
          ? `BRAND CONTEXT:\n${config.brandPrompt}\n\n`
          : "",
        priorInstructions,
      });
      const result = await window.desktopStudio.generate({
        prompt: wrapped,
        model: config.model || model || DEFAULT_MODEL,
        max_tokens: DEFAULT_MAX_TOKENS,
      });
      setResponse(result.text ?? "");
      setModel(result.model ?? config.model ?? model);
      setPriorInstructions((prev) => [...prev, "Auto-Improve pass"]);
      setPhase("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  function handleRefineSubmit(e: React.FormEvent) {
    e.preventDefault();
    runRefine(refineInput);
  }

  return (
    <div className="artifact">
      <header className="artifact-titlebar">
        <span className="artifact-eyebrow">{typeInfo.kind}</span>
        <span className="artifact-title">{prompt || "Untitled"}</span>
        {(phase === "ready" || phase === "refining") && (
          <button
            type="button"
            className="artifact-titlebar-btn"
            onClick={runAutoImprove}
            disabled={isWorking}
            title="Auto-Improve: re-run with a 'make this look like a premium, shipped product' polish pass"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M6 1.5L7.2 4.4L10 5l-2.4 2L8.4 10 6 8.4 3.6 10 4.4 7 2 5l2.8-.6L6 1.5z"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
                fill="currentColor"
                fillOpacity="0.25"
              />
            </svg>
            <span>Auto-Improve</span>
          </button>
        )}
      </header>

      <div
        className={
          "artifact-body" +
          (phase === "ready" || phase === "refining"
            ? " artifact-body-flush"
            : "")
        }
      >
        <StatusRow phase={phase} elapsed={elapsed} model={model} />

        {phase === "thinking" && (
          <h1 className="artifact-prompt">{prompt}</h1>
        )}

        {(phase === "ready" || phase === "refining") && (
          <>
            <div
              className={"artifact-content-wrap" + (phase === "refining" ? " is-refining" : "")}
            >
              <ArtifactRenderer
                content={response}
                fallbackTitle={prompt.slice(0, 30) || "Untitled"}
                fallbackDims={typeInfo.dims}
              />
              {phase === "refining" && (
                <div className="artifact-refine-overlay">
                  <span className="artifact-refine-overlay-dot" />
                  <span>Refining…</span>
                </div>
              )}
            </div>

            <form
              className="artifact-refine-bar"
              onSubmit={handleRefineSubmit}
            >
              <input
                type="text"
                className="artifact-refine-input"
                placeholder={
                  phase === "refining"
                    ? "Refining… please wait"
                    : "Refine this artifact… (e.g. \"make the buttons cyan\", \"add a testimonials section\")"
                }
                value={refineInput}
                onChange={(e) => setRefineInput(e.target.value)}
                disabled={isWorking}
                spellCheck={false}
              />
              <button
                type="submit"
                className="artifact-refine-button"
                disabled={isWorking || !refineInput.trim()}
              >
                {phase === "refining" ? "…" : "Refine"}
              </button>
            </form>
          </>
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
            {response && (
              <button
                type="button"
                className="chip chip-on"
                onClick={() => {
                  setError("");
                  setPhase("ready");
                }}
              >
                Back to last good artifact
              </button>
            )}
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
  const cls =
    phase === "refining" ? "artifact-status artifact-status-thinking"
    : "artifact-status artifact-status-" + phase;
  return (
    <div className={cls}>
      <span className="artifact-status-dot" />
      <span>
        {phase === "thinking" && `Generating… ${elapsed.toFixed(1)}s`}
        {phase === "refining" && `Refining… ${elapsed.toFixed(1)}s`}
        {phase === "ready" && (model ? `Ready · ${model}` : "Ready")}
        {phase === "error" && "Error"}
      </span>
    </div>
  );
}
