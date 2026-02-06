"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SubmoduleItem = {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  order: number;
  lessonsCount: number;
  createdAt: string;
};

type Props = { moduleId: string; moduleTitle: string };

export function AdminSubmodulesList({ moduleId, moduleTitle }: Props) {
  const [submodules, setSubmodules] = useState<SubmoduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  function loadSubmodules() {
    setLoading(true);
    setError("");
    fetch(`/api/admin/modules/${moduleId}/submodules`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar submódulos");
        return res.json();
      })
      .then(setSubmodules)
      .catch(() => setError("No se pudo cargar el listado"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSubmodules();
  }, [moduleId]);

  function openCreate() {
    setEditingId(null);
    setFormTitle("");
    setFormDescription("");
    setFormOrder(submodules.length);
    setShowForm(true);
  }

  function openEdit(s: SubmoduleItem) {
    setEditingId(s.id);
    setFormTitle(s.title);
    setFormDescription(s.description ?? "");
    setFormOrder(s.order);
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
      description: formDescription.trim() || null,
      order: formOrder,
    };
    const url = editingId
      ? `/api/admin/submodules/${editingId}`
      : `/api/admin/modules/${moduleId}/submodules`;
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
        loadSubmodules();
      })
      .catch((err) => setError(err?.error ?? "Error al guardar"))
      .finally(() => setSaving(false));
  }

  async function handleGenerateDescription() {
    const title = formTitle.trim();
    if (!title) return;
    setError("");
    setGeneratingDescription(true);
    try {
      const res = await fetch(
        `/api/admin/modules/${moduleId}/submodules/generate-description`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error al generar");
      if (data.description) setFormDescription(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar la descripción con IA");
    } finally {
      setGeneratingDescription(false);
    }
  }

  function handleDelete(id: string, title: string) {
    if (
      !confirm(
        `¿Eliminar el submódulo "${title}"? Se borrarán todas sus lecciones y ejercicios.`
      )
    )
      return;
    setError("");
    fetch(`/api/admin/submodules/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d));
        loadSubmodules();
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
          Nuevo submódulo
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <h2 className="mb-4 font-medium text-foreground">
            {editingId ? "Editar submódulo" : "Nuevo submódulo"}
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
                Descripción (opcional)
              </span>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <p className="mt-1 text-xs text-muted">
                Si la dejas vacía, se generará automáticamente con IA.
              </p>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={!formTitle.trim() || generatingDescription}
                className="mt-2 rounded border border-accent bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {generatingDescription ? "Generando…" : "Generar descripción con IA"}
              </button>
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

      {submodules.length === 0 && !showForm ? (
        <p className="rounded border border-border px-4 py-8 text-center text-muted">
          No hay submódulos. Crea uno con &quot;Nuevo submódulo&quot;.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="p-3 font-medium text-foreground">Título</th>
                <th className="p-3 font-medium text-foreground">Descripción</th>
                <th className="p-3 font-medium text-foreground">Orden</th>
                <th className="p-3 font-medium text-foreground">Lecciones</th>
                <th className="p-3 font-medium text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {submodules.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border transition-colors hover:bg-surface/50"
                >
                  <td className="p-3 text-foreground">{s.title}</td>
                  <td className="max-w-[200px] truncate p-3 text-muted">
                    {s.description ?? "—"}
                  </td>
                  <td className="p-3 text-muted">{s.order}</td>
                  <td className="p-3 text-muted">{s.lessonsCount}</td>
                  <td className="p-3">
                    <Link
                      href={`/admin/curriculum/${moduleId}/submodules/${s.id}`}
                      className="mr-2 text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      Lecciones
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="mr-2 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id, s.title)}
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
