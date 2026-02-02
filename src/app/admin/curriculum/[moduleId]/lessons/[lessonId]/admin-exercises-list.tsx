"use client";

import { useEffect, useState } from "react";

type ExerciseItem = {
  id: string;
  lessonId: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
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
  const [formType, setFormType] = useState<"MULTIPLE_CHOICE" | "TRUE_FALSE">(
    "MULTIPLE_CHOICE"
  );
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["", ""]);
  const [formCorrectIndex, setFormCorrectIndex] = useState(0);
  const [formCorrectBool, setFormCorrectBool] = useState(true);
  const [formOrder, setFormOrder] = useState(0);
  const [saving, setSaving] = useState(false);

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

  function openCreate() {
    setEditingId(null);
    setFormType("MULTIPLE_CHOICE");
    setFormQuestion("");
    setFormOptions(["", ""]);
    setFormCorrectIndex(0);
    setFormCorrectBool(true);
    setFormOrder(exercises.length);
    setShowForm(true);
  }

  function openEdit(e: ExerciseItem) {
    setEditingId(e.id);
    setFormType(e.type);
    setFormQuestion(e.question);
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
    const options =
      formType === "TRUE_FALSE"
        ? ["Verdadero", "Falso"]
        : formOptions.filter((o) => o.trim());
    const correctAnswer =
      formType === "TRUE_FALSE" ? formCorrectBool : formCorrectIndex;
    const body = {
      type: formType,
      question: formQuestion.trim(),
      options,
      correctAnswer,
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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Nuevo ejercicio
        </button>
      </div>

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
                    e.target.value as "MULTIPLE_CHOICE" | "TRUE_FALSE"
                  )
                }
                className="mt-1 w-full max-w-[200px] rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="MULTIPLE_CHOICE">Opción múltiple</option>
                <option value="TRUE_FALSE">Verdadero / Falso</option>
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
                {ex.type === "TRUE_FALSE"
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
