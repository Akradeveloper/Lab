"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";

type CanSubmit =
  | { canSubmit: true }
  | { canSubmit: false; reason: string; required?: number; current?: number; approved?: boolean };

export function TestimonialForm() {
  const [canSubmit, setCanSubmit] = useState<CanSubmit | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [roleOrTitle, setRoleOrTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/testimonials/can-submit")
      .then((r) => r.json())
      .then((data) => setCanSubmit(data))
      .catch(() => setCanSubmit({ canSubmit: false, reason: "error" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !canSubmit.canSubmit || !text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/testimonials/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), roleOrTitle: roleOrTitle.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Error al enviar", "error");
        return;
      }
      toast("Tu opinión se ha enviado. Aparecerá en la web cuando un administrador la apruebe.", "success");
      setCanSubmit({ canSubmit: false, reason: "already-submitted" });
      setText("");
      setRoleOrTitle("");
    } catch {
      toast("Error de conexión", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    );
  }

  if (!canSubmit) return null;

  if (canSubmit.canSubmit === false) {
    if (canSubmit.reason === "already-submitted") {
      return (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">
            {canSubmit.approved
              ? "Tu opinión ya está publicada en la página de inicio."
              : "Ya has enviado tu opinión. Está pendiente de aprobación por un administrador."}
          </p>
        </div>
      );
    }
    if (canSubmit.reason === "insufficient-progress" && canSubmit.required != null) {
      return (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">
            Completa al menos {canSubmit.required} lecciones para poder dejar tu opinión
            (llevas {canSubmit.current ?? 0}).
          </p>
        </div>
      );
    }
    if (canSubmit.reason === "no-auth") return null;
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted">No puedes enviar una opinión en este momento.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <label className="block">
        <span className="text-sm font-medium text-foreground">Tu opinión sobre QA Lab</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          maxLength={500}
          rows={4}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Cuéntanos tu experiencia en pocas líneas..."
        />
        <span className="text-xs text-muted">{text.length}/500</span>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-foreground">Tu rol o título (opcional)</span>
        <input
          type="text"
          value={roleOrTitle}
          onChange={(e) => setRoleOrTitle(e.target.value)}
          maxLength={200}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Ej: Desarrollador, Estudiante de Ingeniería..."
        />
      </label>
      <button
        type="submit"
        disabled={submitting || !text.trim()}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Enviando…" : "Enviar opinión"}
      </button>
    </form>
  );
}
