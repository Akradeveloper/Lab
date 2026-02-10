"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { CodeEditor } from "@/components/code-editor";
import { useToast } from "@/components/toast";

type Exercise =
  | {
      id: string;
      type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "DESARROLLO";
      question: string;
      options: string[];
      order: number;
    }
  | {
      id: string;
      type: "CODE";
      question: string;
      language: string;
      template: string;
      testCases: Array<{ input: string; expectedOutput: string }>;
      immutablePrefix?: string;
      immutableSuffix?: string;
      order: number;
    };

type LessonNav = {
  id: string;
  title: string;
  submoduleId?: string | null;
};

function lessonHref(moduleId: string, lesson: LessonNav): string {
  if (lesson.submoduleId) {
    return `/modulos/${moduleId}/submodulos/${lesson.submoduleId}/lecciones/${lesson.id}`;
  }
  return `/modulos/${moduleId}/lecciones/${lesson.id}`;
}

type Props = {
  moduleId: string;
  lessonId: string;
  exercises: Exercise[];
  nextLesson: LessonNav | null;
  prevLesson: LessonNav | null;
  backHref: string;
  backLabel: string;
  isProjectLesson?: boolean;
};

export function LessonExercises({
  moduleId,
  lessonId,
  exercises,
  nextLesson,
  prevLesson,
  backHref,
  backLabel,
  isProjectLesson = false,
}: Props) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    allCorrect: boolean;
    results?: { exerciseId: string; correct: boolean }[];
  } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [exercisesPassedForProject, setExercisesPassedForProject] = useState(false);

  // Sistema de pistas
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const [hints, setHints] = useState<Record<string, string>>({});
  const [loadingHint, setLoadingHint] = useState<Record<string, boolean>>({});

  function setAnswer(exerciseId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [exerciseId]: value }));
    setCheckResult(null);
  }

  /** Solicitar pista para un ejercicio */
  async function handleGetHint(exerciseId: string) {
    setLoadingHint((prev) => ({ ...prev, [exerciseId]: true }));
    try {
      const res = await fetch(`/api/curriculum/lessons/${lessonId}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId }),
      });
      const data = await res.json();
      setHints((prev) => ({
        ...prev,
        [exerciseId]: data.hint ?? "No se pudo generar una pista.",
      }));
    } catch {
      setHints((prev) => ({
        ...prev,
        [exerciseId]: "Error al obtener la pista. Inténtalo de nuevo.",
      }));
    } finally {
      setLoadingHint((prev) => ({ ...prev, [exerciseId]: false }));
    }
  }

  async function handleCheck() {
    if (exercises.length === 0) {
      await handleComplete();
      return;
    }
    setChecking(true);
    setCheckResult(null);
    const bodyAnswers = { ...answers };
    for (const e of exercises) {
      if (e.type === "CODE" && bodyAnswers[e.id] === undefined && e.template.trim() !== "") {
        bodyAnswers[e.id] = e.template;
      }
    }
    try {
      const res = await fetch(`/api/curriculum/lessons/${lessonId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: bodyAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error al comprobar");
      setCheckResult({
        allCorrect: data.allCorrect,
        results: data.results,
      });

      // Actualizar intentos fallidos
      if (data.results) {
        const newFailed: Record<string, number> = { ...failedAttempts };
        for (const r of data.results as { exerciseId: string; correct: boolean }[]) {
          if (!r.correct) {
            newFailed[r.exerciseId] = (newFailed[r.exerciseId] ?? 0) + 1;
          }
        }
        setFailedAttempts(newFailed);
      }

      if (data.allCorrect) {
        if (isProjectLesson) {
          setExercisesPassedForProject(true);
        } else {
          await handleComplete();
        }
      }
    } catch {
      setCheckResult({
        allCorrect: false,
        results: undefined,
      });
    } finally {
      setChecking(false);
    }
  }

  const fireConfetti = useCallback(async () => {
    try {
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // canvas-confetti no disponible, ignorar
    }
  }, []);

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/curriculum/lessons/${lessonId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error al guardar progreso");
      setCompleted(true);
      toast("¡Lección completada!", "success");

      // Si se emitió un certificado, mostrar confeti y notificación especial
      if (data.certificateId) {
        fireConfetti();
        setTimeout(() => {
          toast("¡Has obtenido un certificado por completar el módulo!", "success");
        }, 500);
      }
    } catch {
      setCheckResult((prev) => (prev ? { ...prev, allCorrect: false } : null));
      toast("Error al guardar el progreso", "error");
    } finally {
      setCompleting(false);
    }
  }

  const canCheck =
    exercises.length === 0 ||
    exercises.every((e) => {
      if (e.type === "DESARROLLO") return true;
      if (e.type === "CODE") {
        const code =
          answers[e.id] !== undefined
            ? String(answers[e.id]).trim()
            : e.template.trim();
        return code !== "";
      }
      return answers[e.id] !== undefined && answers[e.id] !== "";
    });

  if (exercises.length === 0) {
    if (isProjectLesson) {
      return (
        <section className="rounded-lg border border-border bg-surface p-6">
          <p className="mb-4 text-muted">
            Esta lección es un proyecto. Entrega tu proyecto en el bloque de
            abajo para que un administrador lo revise. Solo cuando aprueben tu
            entrega se marcará la lección como completada.
          </p>
        </section>
      );
    }
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <p className="mb-4 text-muted">
          Esta lección no tiene ejercicios. Márcala como completada para
          continuar.
        </p>
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {completing ? "Guardando…" : "Marcar como completada"}
        </button>
        {completed && (
          <div className="mt-6 rounded border border-accent/50 bg-accent/10 p-4 text-accent">
            <p className="font-medium">Lección completada.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {nextLesson && (
                <Link
                  href={lessonHref(moduleId, nextLesson)}
                  className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Siguiente: {nextLesson.title}
                </Link>
              )}
              <Link
                href={backHref}
                className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {backLabel}
              </Link>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (isProjectLesson && exercisesPassedForProject) {
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <p className="mb-4 font-medium text-accent">
          Has superado los ejercicios. Para completar la lección, entrega el
          proyecto en el bloque de abajo para que un administrador lo revise.
        </p>
      </section>
    );
  }

  if (completed) {
    return (
      <section className="rounded-lg border border-accent/50 bg-accent/10 p-6">
        <p className="mb-4 font-medium text-accent">
          ¡Lección completada correctamente!
        </p>
        <div className="flex flex-wrap gap-2">
          {nextLesson && (
            <Link
              href={lessonHref(moduleId, nextLesson)}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Siguiente: {nextLesson.title}
            </Link>
          )}
          <Link
            href={backHref}
            className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {backLabel}
          </Link>
        </div>
      </section>
    );
  }

  const resultByEx = checkResult?.results
    ? Object.fromEntries(
        checkResult.results.map((r) => [r.exerciseId, r.correct]),
      )
    : null;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Ejercicios</h2>

      {exercises.map((ex) => {
        const globalRes = resultByEx?.[ex.id];
        const isCorrect = globalRes === true;
        const isWrong = globalRes === false;
        const attempts = failedAttempts[ex.id] ?? 0;
        const canShowHint = attempts >= 2 && !hints[ex.id];
        const hint = hints[ex.id];

        return (
          <div
            key={ex.id}
            className={`rounded-lg border bg-surface p-4 transition-colors ${
              isCorrect
                ? "border-green-500/50 bg-green-500/5"
                : isWrong
                  ? "border-error bg-error-bg/20"
                  : "border-border"
            }`}
          >
            <p className="mb-3 font-medium text-foreground">{ex.question}</p>

            {ex.type === "DESARROLLO" && (
              <p className="text-sm text-muted">
                Ejercicio de desarrollo (próximamente). Este ejercicio se
                evaluará en una futura versión.
              </p>
            )}

            {ex.type === "CODE" && (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-muted">
                  Edita el código para que pase los tests:
                </p>
                {ex.immutablePrefix != null && ex.immutablePrefix.trim() !== "" && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Código base (solo lectura)
                    </span>
                    <CodeEditor
                      language={ex.language}
                      value={ex.immutablePrefix}
                      readOnly
                      height="120px"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Tu código
                  </span>
                  <CodeEditor
                    language={ex.language}
                    value={
                      answers[ex.id] !== undefined
                        ? String(answers[ex.id])
                        : ex.template
                    }
                    onChange={(val) => setAnswer(ex.id, val)}
                    height="300px"
                  />
                </div>
                {ex.immutableSuffix != null && ex.immutableSuffix.trim() !== "" && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Código final (solo lectura)
                    </span>
                    <CodeEditor
                      language={ex.language}
                      value={ex.immutableSuffix}
                      readOnly
                      height="120px"
                    />
                  </div>
                )}
                {/* Test cases visibles */}
                {ex.testCases.length > 0 && (
                  <div className="rounded border border-border bg-background p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      Test cases
                    </p>
                    <div className="space-y-1">
                      {ex.testCases.map((tc, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 font-mono text-xs"
                        >
                          <span className="text-muted">#{i + 1}</span>
                          <span className="text-foreground">
                            input: <code className="text-accent">{tc.input}</code>
                          </span>
                          <span className="text-muted">→</span>
                          <span className="text-foreground">
                            esperado: <code className="text-accent">{tc.expectedOutput}</code>
                          </span>
                          {isCorrect && (
                            <span className="ml-auto text-green-500">✓</span>
                          )}
                          {isWrong && (
                            <span className="ml-auto text-error">✗</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {ex.type === "TRUE_FALSE" && (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={ex.id}
                      checked={
                        answers[ex.id] === true || answers[ex.id] === "true"
                      }
                      onChange={() => setAnswer(ex.id, true)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-foreground">Verdadero</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={ex.id}
                      checked={
                        answers[ex.id] === false || answers[ex.id] === "false"
                      }
                      onChange={() => setAnswer(ex.id, false)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-foreground">Falso</span>
                  </label>
                </>
              )}
              {ex.type === "MULTIPLE_CHOICE" &&
                ex.options.map((opt, idx) => (
                  <label key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={ex.id}
                      checked={answers[ex.id] === idx}
                      onChange={() => setAnswer(ex.id, idx)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-foreground">{opt}</span>
                  </label>
                ))}
            </div>

            {/* Resultado individual */}
            {isCorrect && (
              <p className="mt-2 text-sm font-medium text-green-500">
                ¡Correcto!
              </p>
            )}
            {isWrong && (
              <p className="mt-2 text-sm text-error">
                Respuesta incorrecta. Revisa tu respuesta e inténtalo de nuevo.
              </p>
            )}

            {/* Pista */}
            {hint && (
              <div className="mt-3 rounded border border-accent/30 bg-accent/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Pista
                </p>
                <p className="mt-1 text-sm text-foreground">{hint}</p>
              </div>
            )}

            {/* Botón de pista (aparece tras 2 intentos fallidos) */}
            {canShowHint && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleGetHint(ex.id)}
                  disabled={loadingHint[ex.id]}
                  className="rounded border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
                >
                  {loadingHint[ex.id] ? "Generando pista…" : "Ver pista"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {checkResult && !checkResult.allCorrect && checkResult.results && (
        <p className="rounded border border-error bg-error-bg px-4 py-2 text-sm text-error">
          Hay respuestas incorrectas. Revisa y vuelve a comprobar.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleCheck}
          disabled={!canCheck || checking || completing}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {checking || completing
            ? "Comprobando…"
            : exercises.length > 0
              ? "Comprobar todo"
              : isProjectLesson
                ? ""
                : "Marcar como completada"}
        </button>
        {prevLesson && (
          <Link
            href={lessonHref(moduleId, prevLesson)}
            className="rounded text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            ← {prevLesson.title}
          </Link>
        )}
      </div>
    </section>
  );
}
