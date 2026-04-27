"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import type { ReactNode } from "react";

interface MarkdownRendererProps {
  children: ReactNode;
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  const content = typeof children === "string" ? children : String(children ?? "");

  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
      {content}
    </ReactMarkdown>
  );
}
