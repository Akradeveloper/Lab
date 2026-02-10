"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CodeEditor } from "@/components/code-editor";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "typescript", label: "TypeScript" },
] as const;

type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

type JobResult = {
  status: JobStatus;
  position?: number;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  timedOut?: boolean;
};

const DEFAULT_CODE: Record<string, string> = {
  python: "print('Hola, mundo')",
  javascript: "console.log('Hola, mundo');",
  java: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hola, mundo\");\n  }\n}",
  typescript: "console.log('Hola, mundo');",
};

type SnippetItem = { category: string; label: string; code: string };

const SNIPPETS_QA: Record<string, SnippetItem[]> = {
  python: [
    { category: "Clicks", label: "Click por ID", code: 'driver.find_element(By.ID, "mi-id").click()' },
    { category: "Clicks", label: "Click por selector CSS", code: 'driver.find_element(By.CSS_SELECTOR, "button.primary").click()' },
    { category: "Clicks", label: "Click por texto de enlace", code: 'driver.find_element(By.LINK_TEXT, "Enlace").click()' },
    { category: "Asserts", label: "Assert texto en página", code: 'assert "texto esperado" in driver.page_source' },
    { category: "Asserts", label: "Assert título", code: 'assert driver.title == "Título esperado"' },
    { category: "Asserts", label: "Assert URL", code: 'assert "ejemplo.com" in driver.current_url' },
    { category: "Navegación", label: "Ir a URL", code: 'driver.get("https://ejemplo.com")' },
    { category: "Navegación", label: "Atrás", code: "driver.back()" },
    { category: "Navegación", label: "Refrescar", code: "driver.refresh()" },
  ],
  javascript: [
    { category: "Clicks", label: "Click por selector", code: 'await page.click("#mi-id");' },
    { category: "Clicks", label: "Click por texto", code: 'await page.getByText("Enlace").click();' },
    { category: "Clicks", label: "Click por rol", code: 'await page.getByRole("button", { name: "Enviar" }).click();' },
    { category: "Asserts", label: "Assert texto visible", code: 'await expect(page.getByText("texto esperado")).toBeVisible();' },
    { category: "Asserts", label: "Assert título", code: 'await expect(page).toHaveTitle("Título esperado");' },
    { category: "Asserts", label: "Assert URL", code: 'await expect(page).toHaveURL(/ejemplo\\.com/);' },
    { category: "Navegación", label: "Ir a URL", code: 'await page.goto("https://ejemplo.com");' },
    { category: "Navegación", label: "Atrás", code: "await page.goBack();" },
    { category: "Navegación", label: "Refrescar", code: "await page.reload();" },
  ],
  typescript: [
    { category: "Clicks", label: "Click por selector", code: 'await page.click("#mi-id");' },
    { category: "Clicks", label: "Click por texto", code: 'await page.getByText("Enlace").click();' },
    { category: "Clicks", label: "Click por rol", code: 'await page.getByRole("button", { name: "Enviar" }).click();' },
    { category: "Asserts", label: "Assert texto visible", code: 'await expect(page.getByText("texto esperado")).toBeVisible();' },
    { category: "Asserts", label: "Assert título", code: 'await expect(page).toHaveTitle("Título esperado");' },
    { category: "Asserts", label: "Assert URL", code: 'await expect(page).toHaveURL(/ejemplo\\.com/);' },
    { category: "Navegación", label: "Ir a URL", code: 'await page.goto("https://ejemplo.com");' },
    { category: "Navegación", label: "Atrás", code: "await page.goBack();" },
    { category: "Navegación", label: "Refrescar", code: "await page.reload();" },
  ],
  java: [
    { category: "Clicks", label: "Click por ID", code: 'driver.findElement(By.id("mi-id")).click();' },
    { category: "Clicks", label: "Click por selector CSS", code: 'driver.findElement(By.cssSelector("button.primary")).click();' },
    { category: "Clicks", label: "Click por texto de enlace", code: 'driver.findElement(By.linkText("Enlace")).click();' },
    { category: "Asserts", label: "Assert texto en página", code: 'assert driver.getPageSource().contains("texto esperado");' },
    { category: "Asserts", label: "Assert título", code: 'assert driver.getTitle().equals("Título esperado");' },
    { category: "Asserts", label: "Assert URL", code: 'assert driver.getCurrentUrl().contains("ejemplo.com");' },
    { category: "Navegación", label: "Ir a URL", code: 'driver.get("https://ejemplo.com");' },
    { category: "Navegación", label: "Atrás", code: "driver.navigate().back();" },
    { category: "Navegación", label: "Refrescar", code: "driver.navigate().refresh();" },
  ],
};

export default function AdminSandboxPage() {
  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [stdin, setStdin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JobResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const runPolling = useCallback((jobId: string) => {
    const poll = async () => {
      try {
        await fetch("/api/internal/process-queue", { method: "POST", credentials: "include" });
        const res = await fetch(`/api/code/jobs/${jobId}`, { credentials: "include" });
        if (!res.ok) return;
        const data: JobResult = await res.json();
        setResult(data);
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setRunning(false);
        }
      } catch {
        // ignorar errores de red en polling
      }
    };
    poll();
    pollRef.current = setInterval(poll, 800);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setRunning(true);
    try {
      const res = await fetch("/api/admin/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin: stdin || undefined }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        setRunning(false);
        return;
      }
      const { jobId, position } = data;
      setResult({ status: "PENDING", position });
      runPolling(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
      setRunning(false);
    }
  }

  function handleLanguageChange(newLang: string) {
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang] ?? "");
  }

  function insertSnippet(snippetCode: string) {
    setCode((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${snippetCode}` : snippetCode;
    });
  }

  const snippetsForLang = SNIPPETS_QA[language] ?? SNIPPETS_QA.python;
  const byCategory = snippetsForLang.reduce<Record<string, SnippetItem[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Probar sandbox
      </h1>
      <p className="mb-8 text-muted">
        Ejecuta código en el sandbox (Python, JavaScript, Java, TypeScript)
        sin interferir con la cola de ejercicios de los alumnos. Usa la cola
        de admin, que se atiende primero.
      </p>

      <section
        className="rounded-lg border border-border bg-surface p-6"
        aria-labelledby="sandbox-form-heading"
      >
        <h2
          id="sandbox-form-heading"
          className="mb-4 text-xl font-semibold text-foreground"
        >
          Ejecutar código
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Lenguaje</span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={running}
              className="max-w-[200px] rounded border border-border bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            >
              {LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Código rápido</span>
            <p className="text-xs text-muted">
              Inserta plantillas para ejercicios de QA (Selenium/Playwright). Elige según el lenguaje seleccionado.
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(byCategory).map(([cat, items]) => (
                <div key={cat} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {cat}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {items.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        disabled={running}
                        onClick={() => insertSnippet(s.code)}
                        className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                        title={s.code}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground" id="sandbox-code-label">
              Código
            </span>
            <CodeEditor
              language={language}
              value={code}
              onChange={setCode}
              height="300px"
              readOnly={running}
            />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Stdin (opcional)
            </span>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              disabled={running}
              rows={2}
              placeholder="Entrada estándar para el programa"
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={running}
            className="w-fit rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            {running ? "Ejecutando…" : "Ejecutar"}
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}

        {result && running && (
          <p className="mt-4 text-sm text-muted">
            {result.status === "PENDING" && (
              <>En cola (posición {result.position ?? 1})…</>
            )}
            {result.status === "RUNNING" && <>Ejecutando…</>}
          </p>
        )}

        {result && (result.status === "COMPLETED" || result.status === "FAILED") && (
          <div className="mt-6 space-y-4 rounded border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              Resultado:{" "}
              {result.status === "COMPLETED"
                ? `Salida (exit code ${result.exitCode ?? 0})`
                : "Error"}
              {result.timedOut && " · Timeout"}
            </p>
            {result.stdout != null && result.stdout !== "" && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  stdout
                </p>
                <pre className="max-h-48 overflow-auto rounded border border-border bg-surface p-3 font-mono text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                  {result.stdout}
                </pre>
              </div>
            )}
            {result.stderr != null && result.stderr !== "" && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  stderr
                </p>
                <pre className="max-h-48 overflow-auto rounded border border-border bg-surface p-3 font-mono text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word">
                  {result.stderr}
                </pre>
              </div>
            )}
            {(result.stdout == null || result.stdout === "") &&
              (result.stderr == null || result.stderr === "") && (
                <p className="text-sm text-muted">
                  Sin salida. Exit code: {result.exitCode ?? "-"}
                  {result.timedOut && " · Se superó el tiempo límite."}
                </p>
              )}
          </div>
        )}
      </section>
    </>
  );
}
