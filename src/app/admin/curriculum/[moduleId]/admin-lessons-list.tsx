"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LessonItem = {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  order: number;
  exercisesCount: number;
  createdAt: string;
};

type Props = { moduleId: string; moduleTitle: string };

export function AdminLessonsList({ moduleId, moduleTitle }: Props) {
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  function loadLessons() {
    setLoading(true);
    setError("");
    fetch(`/api/admin/modules/${moduleId}/lessons`)
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
  }, [moduleId]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      title: formTitle.trim(),
      content: formContent,
      order: formOrder,
    };
    const url = editingId
      ? `/api/admin/lessons/${editingId}`
      : `/api/admin/modules/${moduleId}/lessons`;
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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Nueva lección
        </button>
      </div>

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
                      href={`/admin/curriculum/${moduleId}/lessons/${l.id}`}
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
