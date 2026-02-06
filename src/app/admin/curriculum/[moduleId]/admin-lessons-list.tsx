"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DIFFICULTY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sin asignar" },
  { value: "APRENDIZ", label: "Aprendiz" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
  { value: "ESPECIALISTA", label: "Especialista" },
];

function difficultyLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const opt = DIFFICULTY_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}

type LessonItem = {
  id: string;
  submoduleId?: string | null;
  moduleId?: string | null;
  title: string;
  content: string;
  order: number;
  difficulty?: string | null;
  exercisesCount: number;
  createdAt: string;
};

type Props = {
  moduleId: string;
  submoduleId: string | null;
  moduleTitle: string;
  submoduleTitle: string | null;
};

const flatMode = (submoduleId: string | null) => submoduleId == null;

export function AdminLessonsList({
  moduleId,
  submoduleId,
  moduleTitle,
  submoduleTitle,
}: Props) {
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formDifficulty, setFormDifficulty] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiAlsoExercises, setAiAlsoExercises] = useState(false);
  const [aiExerciseTypes, setAiExerciseTypes] = useState<string[]>([]);
  const [aiCodeLanguage, setAiCodeLanguage] = useState<
    "python" | "javascript" | "java" | "typescript"
  >("javascript");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [suggestionsLesson, setSuggestionsLesson] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showReorderPreview, setShowReorderPreview] = useState(false);
  const [reorderOrderedIds, setReorderOrderedIds] = useState<string[]>([]);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderApplying, setReorderApplying] = useState(false);

  const lessonsUrl = flatMode(submoduleId)
    ? `/api/admin/modules/${moduleId}/lessons`
    : `/api/admin/submodules/${submoduleId}/lessons`;

  function loadLessons() {
    setLoading(true);
    setError("");
    fetch(lessonsUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar lecciones");
        return res.json();
      })
      .then(setLessons)
      .catch(() => setError("No se pudo cargar el listado"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLessons();
  }, [lessonsUrl]);

  function openCreate() {
    setEditingId(null);
    setFormTitle("");
    setFormContent("");
    setFormOrder(lessons.length);
    setFormDifficulty("");
    setShowForm(true);
  }

  function openEdit(l: LessonItem) {
    setEditingId(l.id);
    setFormTitle(l.title);
    setFormContent(l.content);
    setFormOrder(l.order);
    setFormDifficulty(l.difficulty ?? "");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function closeAIGenerate() {
    setShowAIGenerate(false);
    setAiDifficulty("");
    setAiTopic("");
    setAiAlsoExercises(false);
    setAiExerciseTypes([]);
    setAiCodeLanguage("javascript");
    setSuggestionsLesson([]);
  }

  const AI_CODE_LANGUAGES = [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
    { value: "java", label: "Java" },
    { value: "typescript", label: "TypeScript" },
  ] as const;

  function toggleAiExerciseType(value: string) {
    setAiExerciseTypes((prev) =>
      prev.includes(value)
        ? prev.filter((t) => t !== value)
        : [...prev, value]
    );
  }

  function fetchLessonSuggestions() {
    setLoadingSuggestions(true);
    setSuggestionsLesson([]);
    const url = flatMode(submoduleId)
      ? `/api/admin/modules/${moduleId}/suggest-lessons`
      : `/api/admin/submodules/${submoduleId}/suggest-lessons`;
    fetch(url)
      .then((res) => res.json())
      .then((data: { suggestions?: string[]; error?: string }) => {
        if (data.error && !data.suggestions) {
          setError(data.error);
        } else {
          setSuggestionsLesson(
            Array.isArray(data.suggestions) ? data.suggestions : []
          );
        }
      })
      .catch(() => setError("No se pudieron cargar las sugerencias"))
      .finally(() => setLoadingSuggestions(false));
  }

  function handleAIGenerateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const topic = aiTopic.trim();
    if (!topic) return;
    setError("");
    setAiGenerating(true);
    const generateUrl = flatMode(submoduleId)
      ? `/api/admin/modules/${moduleId}/generate-lesson`
      : `/api/admin/submodules/${submoduleId}/generate-lesson`;
    const lessonBody: Record<string, unknown> = {
      topic,
      difficulty: aiDifficulty.trim() || undefined,
    };
    if (aiAlsoExercises && aiExerciseTypes.includes("CODE")) {
      lessonBody.language = aiCodeLanguage;
    }
    fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lessonBody),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d));
        return res.json();
      })
      .then((lesson: { id: string }) => {
        if (aiAlsoExercises) {
          const exercisesBody: Record<string, unknown> = {
            types: aiExerciseTypes,
          };
          if (aiExerciseTypes.includes("CODE")) {
            exercisesBody.codeLanguage = aiCodeLanguage;
          }
          return fetch(`/api/admin/lessons/${lesson.id}/generate-exercises`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(exercisesBody),
          }).then((r) => {
            if (!r.ok) return r.json().then((d) => Promise.reject(d));
            return lesson;
          });
        }
        return lesson;
      })
      .then(() => {
        closeAIGenerate();
        loadLessons();
      })
      .catch((err) => setError(err?.error ?? "Error al generar con IA"))
      .finally(() => setAiGenerating(false));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      title: formTitle.trim(),
      content: formContent,
      order: formOrder,
      difficulty: formDifficulty === "" ? null : formDifficulty,
    };
    const url = editingId ? `/api/admin/lessons/${editingId}` : lessonsUrl;
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
        loadLessons();
      })
      .catch((err) => setError(err?.error ?? "Error al guardar"))
      .finally(() => setSaving(false));
  }

  function requestSuggestOrder() {
    setError("");
    setReorderLoading(true);
    setReorderOrderedIds([]);
    setShowReorderPreview(true);
    const suggestUrl = flatMode(submoduleId)
      ? `/api/admin/modules/${moduleId}/suggest-lessons-order`
      : `/api/admin/submodules/${submoduleId}/suggest-lessons-order`;
    fetch(suggestUrl, { method: "POST" })
      .then((res) => res.json())
      .then((data: { orderedIds?: string[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        if (!Array.isArray(data.orderedIds)) throw new Error("Orden no válido");
        setReorderOrderedIds(data.orderedIds);
      })
      .catch((err) => setError(err?.message ?? "Error al obtener el orden"))
      .finally(() => setReorderLoading(false));
  }

  function closeReorderPreview() {
    setShowReorderPreview(false);
    setReorderOrderedIds([]);
  }

  function applyReorder() {
    if (reorderOrderedIds.length === 0) return;
    setError("");
    setReorderApplying(true);
    const reorderUrl = flatMode(submoduleId)
      ? `/api/admin/modules/${moduleId}/lessons/reorder`
      : `/api/admin/submodules/${submoduleId}/lessons/reorder`;
    fetch(reorderUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reorderOrderedIds }),
    })
      .then((res) => {
        if (!res.ok)
          return res
            .json()
            .then((d: { error?: string }) =>
              Promise.reject(new Error(d.error))
            );
      })
      .then(() => {
        closeReorderPreview();
        loadLessons();
      })
      .catch((err) => setError(err?.message ?? "Error al aplicar el orden"))
      .finally(() => setReorderApplying(false));
  }

  function handleDelete(id: string, title: string) {
    if (
      !confirm(
        `¿Eliminar la lección "${title}"? Se borrarán todos sus ejercicios.`
      )
    )
      return;
    setError("");
    fetch(`/api/admin/lessons/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d));
        loadLessons();
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
      <div className="flex flex-wrap justify-end gap-2">
        {lessons.length > 1 && (
          <button
            type="button"
            onClick={requestSuggestOrder}
            disabled={reorderLoading}
            className="rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            {reorderLoading ? "Obteniendo orden…" : "Ordenar con IA"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowAIGenerate(true)}
          className="rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Nueva lección con IA
        </button>
        <button
          type="button"
          onClick={openCreate}
          className="rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Nueva lección
        </button>
      </div>

      {showReorderPreview && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-4 font-medium text-foreground">
            Orden sugerido por la IA (de más básico a más complejo)
          </h2>
          {reorderLoading ? (
            <p className="text-muted">Cargando…</p>
          ) : reorderOrderedIds.length > 0 ? (
            <>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
                {reorderOrderedIds.map((id) => {
                  const lesson = lessons.find((l) => l.id === id);
                  return <li key={id}>{lesson?.title ?? id}</li>;
                })}
              </ol>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={applyReorder}
                  disabled={reorderApplying}
                  className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {reorderApplying ? "Aplicando…" : "Aplicar orden"}
                </button>
                <button
                  type="button"
                  onClick={closeReorderPreview}
                  disabled={reorderApplying}
                  className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <p className="text-muted">
              No se pudo obtener un orden. Cierra y vuelve a intentar.
            </p>
          )}
        </div>
      )}

      {showAIGenerate && (
        <form
          onSubmit={handleAIGenerateSubmit}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <h2 className="mb-4 font-medium text-foreground">
            Nueva lección con IA
          </h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Dificultad
              </span>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Tema o título de la lección
              </span>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                required
                placeholder="Ej: Pruebas de regresión"
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiAlsoExercises}
                onChange={(e) => setAiAlsoExercises(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-foreground">
                Generar también ejercicios con IA
              </span>
            </label>
            {aiAlsoExercises && (
              <div className="rounded border border-border bg-surface/50 px-3 py-2">
                <p className="mb-2 text-sm font-medium text-foreground">
                  Tipos de ejercicios a generar
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aiExerciseTypes.includes("MULTIPLE_CHOICE")}
                      onChange={() => toggleAiExerciseType("MULTIPLE_CHOICE")}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">
                      Opción múltiple
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aiExerciseTypes.includes("TRUE_FALSE")}
                      onChange={() => toggleAiExerciseType("TRUE_FALSE")}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">
                      Verdadero / Falso
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aiExerciseTypes.includes("CODE")}
                      onChange={() => toggleAiExerciseType("CODE")}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">Código</span>
                  </label>
                </div>
                {aiExerciseTypes.includes("CODE") && (
                  <div className="mt-2">
                    <span className="text-sm font-medium text-foreground">
                      Lenguaje para teoría, ejemplos y ejercicios de código
                    </span>
                    <select
                      value={aiCodeLanguage}
                      onChange={(e) =>
                        setAiCodeLanguage(
                          e.target.value as
                            | "python"
                            | "javascript"
                            | "java"
                            | "typescript"
                        )
                      }
                      className="mt-1 block rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      {AI_CODE_LANGUAGES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchLessonSuggestions}
                disabled={loadingSuggestions}
                className="rounded border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
              >
                {loadingSuggestions ? "Cargando…" : "Sugerencia"}
              </button>
              {suggestionsLesson.length > 0 && (
                <span className="text-sm text-muted">Elige un tema:</span>
              )}
              {suggestionsLesson.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAiTopic(s)}
                  className="rounded bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={
                aiGenerating ||
                !aiTopic.trim() ||
                (aiAlsoExercises && aiExerciseTypes.length === 0)
              }
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {aiGenerating ? "Generando…" : "Generar"}
            </button>
            <button
              type="button"
              onClick={closeAIGenerate}
              disabled={aiGenerating}
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <h2 className="mb-4 font-medium text-foreground">
            {editingId ? "Editar lección" : "Nueva lección"}
          </h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Título
              </span>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Contenido (Markdown)
              </span>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
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
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Dificultad
              </span>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value)}
                className="mt-1 w-full max-w-[200px] rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value || "none"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving || !formTitle.trim()}
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

      {lessons.length === 0 && !showForm ? (
        <p className="rounded border border-border px-4 py-8 text-center text-muted">
          No hay lecciones. Crea una con &quot;Nueva lección&quot;.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="p-3 font-medium text-foreground">Título</th>
                <th className="p-3 font-medium text-foreground">Dificultad</th>
                <th className="p-3 font-medium text-foreground">Orden</th>
                <th className="p-3 font-medium text-foreground">Ejercicios</th>
                <th className="p-3 font-medium text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-border transition-colors hover:bg-surface/50"
                >
                  <td className="p-3 text-foreground">{l.title}</td>
                  <td className="p-3">
                    {l.difficulty ? (
                      <span className="rounded border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
                        {difficultyLabel(l.difficulty)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-3 text-muted">{l.order}</td>
                  <td className="p-3 text-muted">{l.exercisesCount}</td>
                  <td className="p-3">
                    <Link
                      href={
                        flatMode(submoduleId)
                          ? `/admin/curriculum/${moduleId}/lessons/${l.id}`
                          : `/admin/curriculum/${moduleId}/submodules/${submoduleId}/lessons/${l.id}`
                      }
                      className="mr-2 text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      Gestionar ejercicios
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(l)}
                      className="mr-2 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(l.id, l.title)}
                      className="text-error transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
