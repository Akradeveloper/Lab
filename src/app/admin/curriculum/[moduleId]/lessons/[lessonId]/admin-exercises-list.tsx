"use client";

import { useEffect, useState } from "react";

type ExerciseItem = {
  id: string;
  lessonId: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "CODE" | "DESARROLLO";
  question: string;
  options: string;
  correctAnswer: string;
  order: number;
  createdAt: string;
};

type Props = { moduleId: string; lessonId: string; lessonTitle: string };

export function AdminExercisesList({ moduleId, lessonId, lessonTitle }: Props) {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<
    "MULTIPLE_CHOICE" | "TRUE_FALSE" | "CODE" | "DESARROLLO"
  >("MULTIPLE_CHOICE");
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["", ""]);
  const [formCorrectIndex, setFormCorrectIndex] = useState(0);
  const [formCorrectBool, setFormCorrectBool] = useState(true);
  const [formOrder, setFormOrder] = useState(0);
  const [formCodeLanguage, setFormCodeLanguage] = useState<
    "python" | "javascript" | "java" | "typescript"
  >("javascript");
  const [formCodeTemplate, setFormCodeTemplate] = useState("");
  const [formCodeSolution, setFormCodeSolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generateTypes, setGenerateTypes] = useState<string[]>([]);
  const [generateCodeLanguage, setGenerateCodeLanguage] = useState<
    "python" | "javascript" | "java" | "typescript"
  >("javascript");
  const [suggestionsEx, setSuggestionsEx] = useState<
    Array<{ type: string; description: string }>
  >([]);
  const [loadingSuggestionsEx, setLoadingSuggestionsEx] = useState(false);

  function loadExercises() {
    setLoading(true);
    setError("");
    fetch(`/api/admin/lessons/${lessonId}/exercises`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar ejercicios");
        return res.json();
      })
      .then(setExercises)
      .catch(() => setError("No se pudo cargar el listado"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadExercises();
  }, [lessonId]);

  const CODE_LANGUAGES = [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
    { value: "java", label: "Java" },
    { value: "typescript", label: "TypeScript" },
  ] as const;

  function openCreate() {
    setEditingId(null);
    setFormType("MULTIPLE_CHOICE");
    setFormQuestion("");
    setFormOptions(["", ""]);
    setFormCorrectIndex(0);
    setFormCorrectBool(true);
    setFormOrder(exercises.length);
    setFormCodeLanguage("javascript");
    setFormCodeTemplate("");
    setFormCodeSolution("");
    setShowForm(true);
  }

  function openEdit(e: ExerciseItem) {
    setEditingId(e.id);
    setFormType(
      e.type === "DESARROLLO" ? "DESARROLLO" : e.type === "CODE" ? "CODE" : e.type
    );
    setFormQuestion(e.question);
    if (e.type === "CODE") {
      try {
        const opts = JSON.parse(e.options) as {
          language?: string;
          template?: string;
          testCases?: unknown[];
        };
        const lang = opts?.language;
        setFormCodeLanguage(
          CODE_LANGUAGES.some((l) => l.value === lang)
            ? (lang as "python" | "javascript" | "java" | "typescript")
            : "javascript"
        );
        setFormCodeTemplate(typeof opts?.template === "string" ? opts.template : "");
        setFormCodeSolution(typeof e.correctAnswer === "string" ? e.correctAnswer : "");
      } catch {
        setFormCodeLanguage("javascript");
        setFormCodeTemplate("");
        setFormCodeSolution("");
      }
    } else if (e.type !== "DESARROLLO") {
      try {
        const opts = JSON.parse(e.options) as string[];
        setFormOptions(Array.isArray(opts) && opts.length > 0 ? opts : ["", ""]);
      } catch {
        setFormOptions(["", ""]);
      }
      try {
        const correct = JSON.parse(e.correctAnswer);
        if (e.type === "TRUE_FALSE") {
          setFormCorrectBool(correct === true);
        } else {
          setFormCorrectIndex(typeof correct === "number" ? correct : 0);
        }
      } catch {
        setFormCorrectIndex(0);
        setFormCorrectBool(true);
      }
    }
    setFormOrder(e.order);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function addOption() {
    setFormOptions((prev) => [...prev, ""]);
  }

  function removeOption(i: number) {
    setFormOptions((prev) => prev.filter((_, idx) => idx !== i));
    if (formCorrectIndex >= i && formCorrectIndex > 0) {
      setFormCorrectIndex((prev) => Math.max(0, prev - 1));
    }
  }

  function setOption(i: number, value: string) {
    setFormOptions((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body =
      formType === "DESARROLLO"
        ? {
            type: "DESARROLLO" as const,
            question: formQuestion.trim(),
            order: formOrder,
          }
        : formType === "CODE"
          ? {
              type: "CODE" as const,
              question: formQuestion.trim(),
              order: formOrder,
              options: {
                language: formCodeLanguage,
                template: formCodeTemplate,
                testCases: [] as Array<{ input: string; expectedOutput: string }>,
              },
              correctAnswer: formCodeSolution,
            }
          : {
              type: formType,
              question: formQuestion.trim(),
              options:
                formType === "TRUE_FALSE"
                  ? ["Verdadero", "Falso"]
                  : formOptions.filter((o) => o.trim()),
              correctAnswer:
                formType === "TRUE_FALSE" ? formCorrectBool : formCorrectIndex,
              order: formOrder,
            };
    const url = editingId
      ? `/api/admin/exercises/${editingId}`
      : `/api/admin/lessons/${lessonId}/exercises`;
    const method = editingId ? "PUT" : "POST";
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d));
        return res.json();
      })
      .then(() => {
        closeForm();
        loadExercises();
      })
      .catch((err) => setError(err?.error ?? "Error al guardar"))
      .finally(() => setSaving(false));
  }

  function toggleGenerateType(value: string) {
    setGenerateTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  const GENERATE_CODE_LANGUAGES = [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
    { value: "java", label: "Java" },
    { value: "typescript", label: "TypeScript" },
  ] as const;

  function handleGenerateWithAI() {
    setError("");
    setGeneratingAI(true);
    const body: Record<string, unknown> = { types: generateTypes };
    if (generateTypes.includes("CODE")) {
      body.codeLanguage = generateCodeLanguage;
    }
    fetch(`/api/admin/lessons/${lessonId}/generate-exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d));
        return res.json();
      })
      .then(() => loadExercises())
      .catch((err) =>
        setError(err?.error ?? "Error al generar ejercicios con IA")
      )
      .finally(() => setGeneratingAI(false));
  }

  function fetchExerciseSuggestions() {
    setLoadingSuggestionsEx(true);
    setSuggestionsEx([]);
    setError("");
    fetch(`/api/admin/lessons/${lessonId}/suggest-exercises`)
      .then((res) => res.json())
      .then(
        (data: {
          suggestions?: Array<{ type: string; description: string }>;
          error?: string;
        }) => {
          if (data.error && !data.suggestions) {
            setError(data.error);
          } else {
            setSuggestionsEx(
              Array.isArray(data.suggestions) ? data.suggestions : []
            );
          }
        }
      )
      .catch(() => setError("No se pudieron cargar las sugerencias"))
      .finally(() => setLoadingSuggestionsEx(false));
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este ejercicio?")) return;
    setError("");
    fetch(`/api/admin/exercises/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d));
        loadExercises();
      })
      .catch((err) => setError(err?.error ?? "Error al eliminar"));
  }

  if (loading) {
    return (
      <p className="rounded border border-border px-4 py-8 text-center text-muted">
        Cargando…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded border border-error bg-error-bg px-4 py-2 text-sm text-error">
          {error}
        </p>
      )}
      <div className="space-y-3">
        <div className="rounded border border-border bg-surface/50 px-3 py-2">
          <p className="mb-2 text-sm font-medium text-foreground">
            Tipos de ejercicios a generar
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={generateTypes.includes("MULTIPLE_CHOICE")}
                onChange={() => toggleGenerateType("MULTIPLE_CHOICE")}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">Opción múltiple</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={generateTypes.includes("TRUE_FALSE")}
                onChange={() => toggleGenerateType("TRUE_FALSE")}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">
                Verdadero / Falso
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={generateTypes.includes("CODE")}
                onChange={() => toggleGenerateType("CODE")}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">Código</span>
            </label>
          </div>
          {generateTypes.includes("CODE") && (
            <div className="mt-2">
              <span className="text-sm font-medium text-foreground">
                Lenguaje para ejercicios de código
              </span>
              <select
                value={generateCodeLanguage}
                onChange={(e) =>
                  setGenerateCodeLanguage(
                    e.target.value as
                      | "python"
                      | "javascript"
                      | "java"
                      | "typescript"
                  )
                }
                className="mt-1 block rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {GENERATE_CODE_LANGUAGES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={fetchExerciseSuggestions}
            disabled={loadingSuggestionsEx}
            className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            {loadingSuggestionsEx ? "Cargando…" : "Sugerencia"}
          </button>
          <button
            type="button"
            onClick={handleGenerateWithAI}
            disabled={generatingAI || generateTypes.length === 0}
            className="rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            {generatingAI ? "Generando…" : "Generar ejercicios con IA"}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Nuevo ejercicio
          </button>
        </div>
      </div>
      {suggestionsEx.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            Sugerencias (usa como referencia o genera con IA):
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted">
            {suggestionsEx.map((s, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">
                  {s.type === "CODE"
                    ? "Código"
                    : s.type === "TRUE_FALSE"
                    ? "V/F"
                    : "Test"}
                </span>
                {" — "}
                {s.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <h2 className="mb-4 font-medium text-foreground">
            {editingId ? "Editar ejercicio" : "Nuevo ejercicio"}
          </h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Tipo</span>
              <select
                value={formType}
                onChange={(e) =>
                  setFormType(
                    e.target.value as
                      | "MULTIPLE_CHOICE"
                      | "TRUE_FALSE"
                      | "CODE"
                      | "DESARROLLO"
                  )
                }
                className="mt-1 w-full max-w-[200px] rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="MULTIPLE_CHOICE">Opción múltiple</option>
                <option value="TRUE_FALSE">Verdadero / Falso</option>
                <option value="CODE">Código</option>
                <option value="DESARROLLO">Desarrollo</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Enunciado
              </span>
              <textarea
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                required
                rows={2}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            {formType === "DESARROLLO" && (
              <p className="rounded border border-border bg-surface px-3 py-2 text-sm text-muted">
                Los ejemplos de ejercicios de desarrollo se crearán en otro
                momento. Por ahora solo se guarda el enunciado y el orden.
              </p>
            )}
            {formType === "CODE" && (
              <>
                <p className="text-sm text-muted">
                  El enunciado debe describir la tarea (completar desarrollo,
                  arreglar errores, etc.). La solución es el código exacto con
                  el que se comparará la respuesta del alumno.
                </p>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">
                    Lenguaje
                  </span>
                  <select
                    value={formCodeLanguage}
                    onChange={(e) =>
                      setFormCodeLanguage(
                        e.target.value as
                          | "python"
                          | "javascript"
                          | "java"
                          | "typescript"
                      )
                    }
                    className="mt-1 w-full max-w-[200px] rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {CODE_LANGUAGES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">
                    Código inicial (plantilla)
                  </span>
                  <textarea
                    value={formCodeTemplate}
                    onChange={(e) => setFormCodeTemplate(e.target.value)}
                    spellCheck={false}
                    rows={8}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Código que verá el alumno para completar o corregir"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">
                    Solución (código correcto)
                  </span>
                  <textarea
                    value={formCodeSolution}
                    onChange={(e) => setFormCodeSolution(e.target.value)}
                    spellCheck={false}
                    rows={8}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Código exacto con el que se comparará la respuesta"
                  />
                </label>
              </>
            )}
            {formType === "MULTIPLE_CHOICE" && (
              <>
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Opciones (marca la correcta)
                  </span>
                  <div className="mt-2 space-y-2">
                    {formOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={formCorrectIndex === i}
                          onChange={() => setFormCorrectIndex(i)}
                          className="rounded border-border text-accent focus:ring-accent"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => setOption(i, e.target.value)}
                          placeholder={`Opción ${i + 1}`}
                          className="flex-1 rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                        {formOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(i)}
                            className="text-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-sm text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      + Añadir opción
                    </button>
                  </div>
                </div>
              </>
            )}
            {formType === "TRUE_FALSE" && (
              <div>
                <span className="text-sm font-medium text-foreground">
                  Respuesta correcta
                </span>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctBool"
                      checked={formCorrectBool === true}
                      onChange={() => setFormCorrectBool(true)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    Verdadero
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctBool"
                      checked={formCorrectBool === false}
                      onChange={() => setFormCorrectBool(false)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    Falso
                  </label>
                </div>
              </div>
            )}
            <label className="block">
              <span className="text-sm font-medium text-foreground">Orden</span>
              <input
                type="number"
                value={formOrder}
                onChange={(e) =>
                  setFormOrder(parseInt(e.target.value, 10) || 0)
                }
                className="mt-1 w-full max-w-[120px] rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={
                saving ||
                !formQuestion.trim() ||
                (formType === "MULTIPLE_CHOICE" &&
                  formOptions.filter((o) => o.trim()).length < 2)
              }
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {exercises.length === 0 && !showForm ? (
        <p className="rounded border border-border px-4 py-8 text-center text-muted">
          No hay ejercicios. Crea uno con &quot;Nuevo ejercicio&quot;.
        </p>
      ) : (
        <div className="space-y-3">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <p className="font-medium text-foreground">{ex.question}</p>
              <p className="mt-1 text-sm text-muted">
                Tipo:{" "}
                {ex.type === "CODE"
                  ? "Código"
                  : ex.type === "DESARROLLO"
                    ? "Desarrollo"
                    : ex.type === "TRUE_FALSE"
                      ? "Verdadero/Falso"
                      : "Opción múltiple"}
                {" · "}Orden: {ex.order}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(ex)}
                  className="text-sm text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(ex.id)}
                  className="text-sm text-error transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
