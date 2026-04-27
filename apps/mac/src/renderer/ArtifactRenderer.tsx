import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  parseGeneratedHtmlArtifact,
  buildHtmlArtifactErrorDocument,
  addIframeNavGuard,
  injectVisualEditor,
} from "@desktop-studio/core";

type Props = {
  /** Raw text returned by /api/generate (should be a complete HTML document). */
  content: string;
  fallbackTitle?: string;
  fallbackDims?: { w: number; h: number };
};

/**
 * Renders the generation response. The pill submit always asks Claude for HTML
 * (via buildHtmlArtifactPrompt), so the success path is the iframe. We still
 * keep a markdown fallback in case the model goes off-script — better than a
 * blank screen.
 */
export function ArtifactRenderer({
  content,
  fallbackTitle = "Untitled",
  fallbackDims = { w: 560, h: 440 },
}: Props) {
  const parsed = parseGeneratedHtmlArtifact(content, {
    fallbackTitle,
    fallbackWidth: fallbackDims.w,
    fallbackHeight: fallbackDims.h,
  });

  if (parsed && parsed.success && typeof parsed.content === "string") {
    let html: string = parsed.content;
    html = addIframeNavGuard(html);
    html = injectVisualEditor(html);
    return <HtmlFrame html={html} />;
  }

  // The parser failed AND the response doesn't look like HTML at all. Fall back
  // to markdown so you still see something readable. Most Claude responses
  // following the master prompt won't hit this path.
  if (looksLikeMarkdown(content)) {
    return (
      <div className="artifact-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  // Last-resort: render the parser's friendly error doc inside the iframe so
  // the user can see what went wrong + the raw response.
  const errorHtml = buildHtmlArtifactErrorDocument(
    parsed?.title || fallbackTitle,
    parsed?.error || "Could not produce a valid HTML document.",
    typeof content === "string" ? content : ""
  );
  return <HtmlFrame html={errorHtml} />;
}

function HtmlFrame({ html }: { html: string }) {
  return (
    <iframe
      className="artifact-iframe"
      title="Artifact"
      srcDoc={html}
      sandbox="allow-scripts allow-popups allow-forms"
    />
  );
}

function looksLikeMarkdown(text: string) {
  if (typeof text !== "string") return false;
  return /(^|\n)#{1,6}\s|\n```|(^|\n)\*\s|(^|\n)-\s\w|\n>\s/.test(text.trim());
}
