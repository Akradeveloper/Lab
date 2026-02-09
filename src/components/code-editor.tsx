"use client";

import { useTheme } from "@/components/theme-provider";
import dynamic from "next/dynamic";

// Carga dinámica para evitar SSR con Monaco
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[200px] items-center justify-center rounded border border-border bg-background">
      <p className="text-sm text-muted">Cargando editor…</p>
    </div>
  ),
});

const LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  js: "javascript",
  python: "python",
  py: "python",
  typescript: "typescript",
  ts: "typescript",
  java: "java",
};

type Props = {
  language?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
  /** Texto placeholder cuando el editor está vacío. */
  placeholder?: string;
};

/**
 * Wrapper de Monaco Editor sincronizado con el tema de la app.
 * Syntax highlighting nativo para JS, Python, TS y Java.
 */
export function CodeEditor({
  language = "javascript",
  value,
  onChange,
  readOnly = false,
  height = "300px",
}: Props) {
  const { theme } = useTheme();
  const monacoLang = LANGUAGE_MAP[language.toLowerCase()] ?? "plaintext";

  return (
    <div className="overflow-hidden rounded border border-border">
      <MonacoEditor
        height={height}
        language={monacoLang}
        value={value ?? ""}
        theme={theme === "dark" ? "vs-dark" : "vs"}
        onChange={(val) => onChange?.(val ?? "")}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}
