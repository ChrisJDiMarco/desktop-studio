import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Kind = "html" | "react" | "markdown" | "text";
type Detected = { kind: Kind; content: string };

/**
 * Models often wrap output in a single ``` fence even when asked not to.
 * Strip a top-level fence wrapper so detection works on the inner payload.
 */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:[\w-]+)?\s*\n([\s\S]*?)\n```\s*$/);
  return fence ? fence[1] : trimmed;
}

/**
 * Decide what kind of artifact this content is and extract the renderable
 * payload. Order matters: HTML doc takes precedence over JSX which takes
 * precedence over markdown which takes precedence over plain text.
 */
function detectAndExtract(raw: string): Detected {
  const stripped = stripCodeFence(raw);

  // Full HTML document — pull out the doc even if there's extra prose around it.
  const docMatch = stripped.match(
    /<!doctype\s+html[\s\S]*?<\/html>\s*/i
  );
  if (docMatch) return { kind: "html", content: docMatch[0] };
  const htmlMatch = stripped.match(/<html[\s>][\s\S]*?<\/html>\s*/i);
  if (htmlMatch) return { kind: "html", content: htmlMatch[0] };

  // React / Thinklet component (JSX). Tighten up the heuristic a bit so
  // explanatory prose mentioning "function App()" doesn't false-positive.
  const looksLikeComponent =
    /(?:export\s+default\s+function|function\s+App\s*\(|const\s+App\s*=)/.test(
      stripped
    ) && /(?:return\s*\(|<[A-Z]\w*[\s/>])/.test(stripped);
  if (looksLikeComponent) return { kind: "react", content: stripped };

  // Markdown markers
  const looksLikeMarkdown =
    /(^|\n)#{1,6}\s|\n```|(^|\n)\*\s|(^|\n)-\s\w|\n>\s/.test(stripped);
  if (looksLikeMarkdown) return { kind: "markdown", content: stripped };

  return { kind: "text", content: stripped };
}

export function ArtifactRenderer({ content }: { content: string }) {
  const detected = detectAndExtract(content);

  switch (detected.kind) {
    case "html":
      return <HtmlFrame html={detected.content} />;
    case "react":
      return <ReactStub code={detected.content} />;
    case "markdown":
      return (
        <div className="artifact-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {detected.content}
          </ReactMarkdown>
        </div>
      );
    case "text":
    default:
      return <pre className="artifact-text">{detected.content}</pre>;
  }
}

function HtmlFrame({ html }: { html: string }) {
  return (
    <iframe
      className="artifact-iframe"
      title="Artifact"
      srcDoc={html}
      sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
    />
  );
}

function ReactStub({ code }: { code: string }) {
  return (
    <>
      <div className="artifact-notice">
        Detected a React / Thinklet component. Inline runtime rendering ports
        in the next chunk (artifact-runtime → packages/core). For now, here's
        the source:
      </div>
      <pre className="artifact-text artifact-code">
        <code>{code}</code>
      </pre>
    </>
  );
}
