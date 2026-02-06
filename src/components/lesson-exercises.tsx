"use client";

import { useState } from "react";
import Link from "next/link";

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
};

export function LessonExercises({
  moduleId,
  lessonId,
  exercises,
  nextLesson,
  prevLesson,
  backHref,
  backLabel,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    allCorrect: boolean;
    results?: { exerciseId: string; correct: boolean }[];
  } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);

  function setAnswer(exerciseId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [exerciseId]: value }));
    setCheckResult(null);
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
      if (data.allCorrect) {
        await handleComplete();
      }
    } catch (e) {
      setCheckResult({
        allCorrect: false,
        results: undefined,
      });
    } finally {
      setChecking(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/curriculum/lessons/${lessonId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error al guardar progreso");
      setCompleted(true);
    } catch {
      setCheckResult((prev) => (prev ? { ...prev, allCorrect: false } : null));
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
        checkResult.results.map((r) => [r.exerciseId, r.correct])
      )
    : null;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Ejercicios</h2>

      {exercises.map((ex) => (
        <div
          key={ex.id}
          className={`rounded-lg border bg-surface p-4 ${
            resultByEx && resultByEx[ex.id] === false
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
            <div className="mt-2">
              <label className="block text-sm text-muted mb-1">
                Edita el código (puedes hacer pocos cambios para que pase los tests):
              </label>
              <textarea
                value={
                  answers[ex.id] !== undefined
                    ? String(answers[ex.id])
                    : ex.template
                }
                onChange={(e) => setAnswer(ex.id, e.target.value)}
                spellCheck={false}
                rows={12}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
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
          {resultByEx && resultByEx[ex.id] === false && (
            <p className="mt-2 text-sm text-error">
              Respuesta incorrecta. Inténtalo de nuevo.
            </p>
          )}
        </div>
      ))}

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
            ? "Comprobar respuestas"
            : "Marcar como completada"}
        </button>
        {prevLesson && (
          <Link
            href={lessonHref(moduleId, prevLesson)}
            className="text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            ← {prevLesson.title}
          </Link>
        )}
      </div>
    </section>
  );
}
