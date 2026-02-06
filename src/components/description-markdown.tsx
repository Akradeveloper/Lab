"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

type DescriptionMarkdownProps = { content: string; className?: string };

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
};

export function DescriptionMarkdown({
  content,
  className = "",
}: DescriptionMarkdownProps) {
  return (
    <div className={`text-muted ${className}`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
