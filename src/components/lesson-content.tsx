"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { CodeTabs, type CodeBlock } from "@/components/code-tabs";

// Importar estilos de highlight.js (tema oscuro sutil compatible con el diseño)
import "highlight.js/styles/github-dark-dimmed.css";

type LessonContentProps = { content: string };

// ---------------------------------------------------------------------------
// Pre-procesador: extrae secciones <!-- code-tabs --> ... <!-- /code-tabs -->
// y las reemplaza por placeholders %%CODE_TABS_N%%.
// ---------------------------------------------------------------------------

type TabSection = {
  blocks: CodeBlock[];
};

const CODE_TABS_OPEN = /<!--\s*code-tabs\s*-->/g;
const CODE_TABS_CLOSE = /<!--\s*\/code-tabs\s*-->/;
const FENCED_BLOCK = /```(\w+)\n([\s\S]*?)```/g;

function extractCodeTabSections(markdown: string): {
  cleaned: string;
  sections: TabSection[];
} {
  const sections: TabSection[] = [];
  let cleaned = markdown;
  let match: RegExpExecArray | null;
  let idx = 0;

  // Buscar cada apertura de code-tabs
  // Usamos un bucle manual porque reemplazamos sobre la marcha
  while (true) {
    CODE_TABS_OPEN.lastIndex = 0;
    match = CODE_TABS_OPEN.exec(cleaned);
    if (!match) break;

    const openStart = match.index;
    const openEnd = openStart + match[0].length;
    const rest = cleaned.slice(openEnd);
    const closeMatch = CODE_TABS_CLOSE.exec(rest);

    if (!closeMatch) {
      // No se encontró cierre; dejar el contenido tal cual
      break;
    }

    const innerContent = rest.slice(0, closeMatch.index);
    const closeEnd = openEnd + closeMatch.index + closeMatch[0].length;

    // Extraer bloques de código del contenido interior
    const blocks: CodeBlock[] = [];
    let blockMatch: RegExpExecArray | null;
    FENCED_BLOCK.lastIndex = 0;
    while ((blockMatch = FENCED_BLOCK.exec(innerContent)) !== null) {
      blocks.push({
        language: blockMatch[1],
        code: blockMatch[2].trimEnd(),
      });
    }

    if (blocks.length > 0) {
      const placeholder = `%%CODE_TABS_${idx}%%`;
      sections.push({ blocks });
      cleaned =
        cleaned.slice(0, openStart) + placeholder + cleaned.slice(closeEnd);
      idx++;
    } else {
      // Sin bloques válidos; quitar marcadores y dejar contenido
      cleaned =
        cleaned.slice(0, openStart) +
        innerContent +
        cleaned.slice(closeEnd);
    }
  }

  return { cleaned, sections };
}

// ---------------------------------------------------------------------------
// Componentes personalizados de Markdown
// ---------------------------------------------------------------------------

function buildComponents(sections: TabSection[]): Components {
  return {
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
    p: ({ children }) => {
      // Detectar placeholders de code-tabs
      if (
        typeof children === "string" ||
        (Array.isArray(children) && children.length === 1 && typeof children[0] === "string")
      ) {
        const text = typeof children === "string" ? children : (children[0] as string);
        const tabMatch = /^%%CODE_TABS_(\d+)%%$/.exec(text.trim());
        if (tabMatch) {
          const sectionIdx = parseInt(tabMatch[1], 10);
          const section = sections[sectionIdx];
          if (section) {
            return <CodeTabs blocks={section.blocks} />;
          }
        }
      }
      return <p className="mb-4 leading-relaxed text-muted">{children}</p>;
    },
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.includes("language-") || className?.includes("hljs");
      if (isBlock) {
        return (
          <code className={`block font-mono text-sm whitespace-pre ${className ?? ""}`}>
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
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function LessonContent({ content }: LessonContentProps) {
  const { cleaned, sections } = extractCodeTabSections(
    content || "*Sin contenido.*",
  );
  const components = buildComponents(sections);

  return (
    <div className="lesson-content max-w-none">
      <ReactMarkdown
        components={components}
        rehypePlugins={[rehypeHighlight]}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}
