"use client";

import { useEffect, useState } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import java from "highlight.js/lib/languages/java";

// Registrar solo los lenguajes necesarios para reducir el bundle
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("java", java);

const STORAGE_KEY = "qa-lab-preferred-lang";

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  typescript: "TypeScript",
  java: "Java",
};

/** Orden fijo de pestañas */
const TAB_ORDER = ["javascript", "python", "typescript", "java"];

export type CodeBlock = {
  language: string;
  code: string;
};

type CodeTabsProps = {
  blocks: CodeBlock[];
};

function getStoredLanguage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLanguage(lang: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Silenciar errores de localStorage (privado, lleno, etc.)
  }
}

function highlightCode(code: string, language: string): string {
  try {
    if (hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
  } catch {
    // Fallback: sin highlighting
  }
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function CodeTabs({ blocks }: CodeTabsProps) {
  // Ordenar bloques según TAB_ORDER
  const sortedBlocks = [...blocks].sort((a, b) => {
    const ai = TAB_ORDER.indexOf(a.language);
    const bi = TAB_ORDER.indexOf(b.language);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const availableLanguages = sortedBlocks.map((b) => b.language);

  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = getStoredLanguage();
    if (stored && availableLanguages.includes(stored)) return stored;
    return availableLanguages[0] ?? "javascript";
  });

  // Si la preferencia guardada cambia desde otra instancia del componente
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored && availableLanguages.includes(stored) && stored !== activeTab) {
      setActiveTab(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabClick = (lang: string) => {
    setActiveTab(lang);
    storeLanguage(lang);

    // Sincronizar otros CodeTabs en la misma página
    window.dispatchEvent(
      new CustomEvent("qa-lab-lang-change", { detail: lang }),
    );
  };

  // Escuchar cambios de otros CodeTabs
  useEffect(() => {
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<string>).detail;
      if (lang && availableLanguages.includes(lang)) {
        setActiveTab(lang);
      }
    };
    window.addEventListener("qa-lab-lang-change", handler);
    return () => window.removeEventListener("qa-lab-lang-change", handler);
  }, [availableLanguages]);

  const activeBlock = sortedBlocks.find((b) => b.language === activeTab);

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-border">
      {/* Barra de pestañas */}
      <div className="flex border-b border-border bg-surface/50">
        {sortedBlocks.map((block) => (
          <button
            key={block.language}
            type="button"
            onClick={() => handleTabClick(block.language)}
            className={`px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              activeTab === block.language
                ? "border-b-2 border-accent bg-surface text-accent"
                : "text-muted hover:text-foreground hover:bg-surface/80"
            }`}
          >
            {LANGUAGE_LABELS[block.language] ?? block.language}
          </button>
        ))}
      </div>

      {/* Bloque de código */}
      {activeBlock && (
        <pre className="overflow-x-auto bg-surface p-4">
          <code
            className={`hljs block font-mono text-sm text-foreground whitespace-pre language-${activeBlock.language}`}
            dangerouslySetInnerHTML={{
              __html: highlightCode(activeBlock.code, activeBlock.language),
            }}
          />
        </pre>
      )}
    </div>
  );
}
