"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LessonItem = {
  id: string;
  submoduleId?: string | null;
  moduleId?: string | null;
  title: string;
  content: string;
  order: number;
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
  const [saving, setSaving] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiAlsoExercises, setAiAlsoExercises] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [suggestionsLesson, setSuggestionsLesson] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
    setShowForm(true);
  }

  function openEdit(l: LessonItem) {
    setEditingId(l.id);
    setFormTitle(l.title);
    setFormContent(l.content);
    setFormOrder(l.order);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function closeAIGenerate() {
    setShowAIGenerate(false);
    setAiTopic("");
    setAiAlsoExercises(false);
    setSuggestionsLesson([]);
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
    fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d));
        return res.json();
      })
      .then((lesson: { id: string }) => {
        if (aiAlsoExercises) {
          return fetch(`/api/admin/lessons/${lesson.id}/generate-exercises`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
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
      <div className="flex justify-end gap-2">
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
              disabled={aiGenerating || !aiTopic.trim()}
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
