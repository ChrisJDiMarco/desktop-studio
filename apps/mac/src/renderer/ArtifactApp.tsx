import { useEffect, useMemo, useState } from "react";
import { ArtifactRenderer } from "./ArtifactRenderer";

type Phase = "thinking" | "ready" | "error";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 8192;

/**
 * System-style preamble we glue onto the user's prompt so artifact windows
 * actually render runnable HTML instead of a chat-style description.
 * /api/generate already injects DESIGN.md as the system prompt; this just
 * tells Claude what *shape* of output we want.
 */
const HTML_ARTIFACT_PREAMBLE = [
  "Produce a single-file HTML5 artifact that fulfills the user's request below.",
  "Output ONLY the HTML — start with <!DOCTYPE html>, include any CSS in <style> tags and any JS in <script> tags inside the document.",
  "Use Tailwind via <script src=\"https://cdn.tailwindcss.com\"></script>.",
  "Default aesthetic: dark, glassmorphic, generous whitespace, large display typography, vibrant cyan accent. The DESIGN.md system prompt will guide finer details.",
  "Make it production-quality, mobile-responsive, and interactive where appropriate.",
  "Do NOT wrap the output in markdown code fences. Do NOT add any explanation. Output raw HTML only.",
  "",
  "User request: ",
].join("\n");

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

  useEffect(() => {
    if (phase !== "thinking") return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [phase, startedAt]);

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
        const result = await window.desktopStudio.generate({
          prompt: HTML_ARTIFACT_PREAMBLE + prompt,
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
  }, [prompt]);

  return (
    <div className="artifact">
      <header className="artifact-titlebar">
        <span className="artifact-eyebrow">Thinklet</span>
        <span className="artifact-title">{prompt || "Untitled"}</span>
      </header>

      <div className={"artifact-body" + (phase === "ready" ? " artifact-body-flush" : "")}>
        <StatusRow phase={phase} elapsed={elapsed} model={model} />

        {phase !== "ready" && (
          <h1 className="artifact-prompt">{prompt}</h1>
        )}

        {phase === "ready" && <ArtifactRenderer content={response} />}

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
