import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

type LessonContentProps = { content: string };

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-8 text-2xl font-bold text-foreground text-center first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-4 border-b border-border pb-2 text-xl font-semibold text-accent">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-3 text-lg font-medium text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-relaxed text-muted">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block font-mono text-sm text-foreground whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-sm text-accent">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg border border-border bg-surface p-4">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-accent bg-surface/50 py-2 pl-4 text-muted">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed text-muted">{children}</li>
  ),
};

export function LessonContent({ content }: LessonContentProps) {
  return (
    <div className="lesson-content max-w-none">
      <ReactMarkdown components={components}>
        {content || "*Sin contenido.*"}
      </ReactMarkdown>
    </div>
  );
}
