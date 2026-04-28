import { useEffect, useMemo, useRef, useState } from "react";
import {
  detectArtifactKind,
  detectHtmlArtifactType,
  buildHtmlArtifactPrompt,
  buildHtmlArtifactRefinePrompt,
  buildHtmlArtifactAutoImprovePrompt,
  buildImageArtifactPrompt,
  type ArtifactKind,
  type HtmlArtifactType,
} from "@desktop-studio/core";
import { ArtifactRenderer } from "./ArtifactRenderer";

type Phase = "thinking" | "ready" | "refining" | "error";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 64_000;
const DEFAULT_IMAGE_ASPECT = "1:1";

function readPromptFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return decodeURIComponent(params.get("artifact") ?? "");
}

export default function ArtifactApp() {
  const [prompt] = useState(readPromptFromHash);
  const [phase, setPhase] = useState<Phase>("thinking");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [refineInput, setRefineInput] = useState("");
  const [priorInstructions, setPriorInstructions] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const refineInputRef = useRef<HTMLInputElement>(null);

  // HTML branch state
  const [htmlResponse, setHtmlResponse] = useState("");

  // Image branch state — track URL plus accumulated prompt as the user
  // refines (image gen has no built-in "edit existing image" so each
  // refinement re-renders from a longer combined prompt).
  const [imageUrl, setImageUrl] = useState("");
  const [imagePrompt, setImagePrompt] = useState(prompt);

  const startedAt = useRef(Date.now());

  const kind: ArtifactKind = useMemo(
    () => detectArtifactKind(prompt || ""),
    [prompt]
  );
  const htmlTypeInfo: HtmlArtifactType = useMemo(
    () => detectHtmlArtifactType(prompt || ""),
    [prompt]
  );

  const isWorking = phase === "thinking" || phase === "refining";

  const eyebrow =
    kind === "image"
      ? "Image"
      : kind === "video"
        ? "Video"
        : htmlTypeInfo.kind;

  useEffect(() => {
    if (!isWorking) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - startedAt.current) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [isWorking]);

  // Auto-focus the refine input the moment Edit mode is turned on so the
  // user can start typing immediately. Without this they'd have to click
  // into the field after toggling.
  useEffect(() => {
    if (editMode) {
      requestAnimationFrame(() => refineInputRef.current?.focus());
    }
  }, [editMode]);

  // Initial generation on mount.
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
        const sysCtx = config.brandPrompt
          ? `BRAND CONTEXT:\n${config.brandPrompt}\n\n`
          : "";

        if (kind === "image") {
          const wrapped = buildImageArtifactPrompt(prompt, {
            systemContext: sysCtx,
          });
          setImagePrompt(wrapped);
          const result = await window.desktopStudio.generateImage({
            prompt: wrapped,
            aspectRatio: DEFAULT_IMAGE_ASPECT,
          });
          if (cancelled) return;
          setImageUrl(result.url);
          setModel(result.model ?? "");
          setPhase("ready");
          return;
        }

        // Default: HTML artifact.
        const wrapped = buildHtmlArtifactPrompt(prompt, {
          typeInfo: htmlTypeInfo,
          systemContext: sysCtx,
        });
        const result = await window.desktopStudio.generate({
          prompt: wrapped,
          model: config.model || DEFAULT_MODEL,
          max_tokens: DEFAULT_MAX_TOKENS,
        });
        if (cancelled) return;
        setHtmlResponse(result.text ?? "");
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
  }, [prompt, kind, htmlTypeInfo]);

  async function runRefine(instruction: string) {
    if (!instruction.trim() || isWorking) return;
    const trimmed = instruction.trim();

    startedAt.current = Date.now();
    setElapsed(0);
    setPhase("refining");
    setError("");

    try {
      const config = await window.desktopStudio.getConfig();
      const sysCtx = config.brandPrompt
        ? `BRAND CONTEXT:\n${config.brandPrompt}\n\n`
        : "";

      if (kind === "image") {
        // Image refines re-render with the original concept + the new
        // adjustment ("…, but with cooler tones, golden hour lighting").
        const newPrompt = `${imagePrompt}, ${trimmed}`;
        setImagePrompt(newPrompt);
        const result = await window.desktopStudio.generateImage({
          prompt: newPrompt,
          aspectRatio: DEFAULT_IMAGE_ASPECT,
        });
        setImageUrl(result.url);
        setModel(result.model ?? model);
      } else {
        const wrapped = buildHtmlArtifactRefinePrompt(htmlResponse, trimmed, {
          systemContext: sysCtx,
          priorInstructions,
        });
        const result = await window.desktopStudio.generate({
          prompt: wrapped,
          model: config.model || model || DEFAULT_MODEL,
          max_tokens: DEFAULT_MAX_TOKENS,
        });
        setHtmlResponse(result.text ?? "");
        setModel(result.model ?? config.model ?? model);
      }

      setPriorInstructions((prev) => [...prev, trimmed]);
      setRefineInput("");
      setPhase("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  async function runAutoImprove() {
    if (isWorking || (!htmlResponse && !imageUrl)) return;
    if (kind === "image") {
      // For images, "Auto-Improve" means asking for higher quality + finer
      // detail on the same concept.
      runRefine(
        "higher quality, sharper details, better lighting, more refined composition"
      );
      return;
    }

    startedAt.current = Date.now();
    setElapsed(0);
    setPhase("refining");
    setError("");

    try {
      const config = await window.desktopStudio.getConfig();
      const wrapped = buildHtmlArtifactAutoImprovePrompt(htmlResponse, {
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
      setHtmlResponse(result.text ?? "");
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

  const hasContent = kind === "image" ? !!imageUrl : !!htmlResponse;

  return (
    <div className="artifact">
      <header className="artifact-titlebar">
        <span className="artifact-eyebrow">{eyebrow}</span>
        <span className="artifact-title">{prompt || "Untitled"}</span>
        {(phase === "ready" || phase === "refining") && hasContent && (
          <div className="artifact-titlebar-actions">
            <button
              type="button"
              className={"artifact-titlebar-btn" + (editMode ? " is-active" : "")}
              onClick={() => setEditMode((v) => !v)}
              disabled={isWorking}
              title={
                editMode
                  ? "Hide the refine input"
                  : kind === "image"
                    ? "Open the refine input to adjust this image"
                    : "Open the refine input to adjust this artifact"
              }
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>{editMode ? "Done" : "Edit"}</span>
            </button>

            <button
              type="button"
              className="artifact-titlebar-btn"
              onClick={runAutoImprove}
              disabled={isWorking}
              title={
                kind === "image"
                  ? "Re-render with sharper detail + better composition"
                  : "Re-run with a 'make this look like a premium, shipped product' polish pass"
              }
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
          </div>
        )}
      </header>

      <div
        className={
          "artifact-body" +
          (phase === "ready" || phase === "refining" ? " artifact-body-flush" : "")
        }
      >
        <StatusRow phase={phase} elapsed={elapsed} model={model} />

        {phase === "thinking" && <h1 className="artifact-prompt">{prompt}</h1>}

        {(phase === "ready" || phase === "refining") && (
          <>
            <div
              className={"artifact-content-wrap" + (phase === "refining" ? " is-refining" : "")}
            >
              {kind === "image" ? (
                <ImageArtifactView url={imageUrl} alt={prompt} />
              ) : (
                <ArtifactRenderer
                  content={htmlResponse}
                  fallbackTitle={prompt.slice(0, 30) || "Untitled"}
                  fallbackDims={htmlTypeInfo.dims}
                  editMode={editMode}
                />
              )}
              {phase === "refining" && (
                <div className="artifact-refine-overlay">
                  <span className="artifact-refine-overlay-dot" />
                  <span>{kind === "image" ? "Re-rendering…" : "Refining…"}</span>
                </div>
              )}
            </div>

            {editMode && (
              <form className="artifact-refine-bar" onSubmit={handleRefineSubmit}>
                <input
                  ref={refineInputRef}
                  type="text"
                  className="artifact-refine-input"
                  placeholder={
                    phase === "refining"
                      ? kind === "image"
                        ? "Re-rendering… please wait"
                        : "Refining… please wait"
                      : kind === "image"
                        ? "Describe a change… (e.g. \"warmer tones\", \"add a foreground element\")"
                        : "Describe a change… (e.g. \"make the buttons cyan\", \"add a testimonials section\")"
                  }
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditMode(false);
                    }
                  }}
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
            )}
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
            {hasContent && (
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

function ImageArtifactView({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="artifact-image-frame">
      <img src={url} alt={alt} className="artifact-image" />
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
    phase === "refining"
      ? "artifact-status artifact-status-thinking"
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
