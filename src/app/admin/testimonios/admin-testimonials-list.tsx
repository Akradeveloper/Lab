"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";

type TestimonialRow = {
  id: string;
  text: string;
  roleOrTitle: string | null;
  approved: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

export function AdminTestimonialsList() {
  const [items, setItems] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  function load() {
    fetch("/api/admin/testimonials")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
        else setItems([]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function setApproved(id: string, approved: boolean) {
    try {
      const res = await fetch(`/api/admin/testimonials/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error();
      toast(approved ? "Testimonio aprobado" : "Testimonio rechazado", "success");
      setItems((prev) =>
        prev.map((t) => (t.id === id ? { ...t, approved } : t)),
      );
    } catch {
      toast("Error al actualizar", "error");
    }
  }

  if (loading) {
    return <p className="text-muted">Cargando testimonios…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded border border-border bg-surface p-6 text-muted">
        Aún no hay testimonios enviados.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((t) => (
        <li
          key={t.id}
          className={`rounded-lg border p-4 ${
            t.approved ? "border-green-500/30 bg-green-500/5" : "border-border bg-surface"
          }`}
        >
          <p className="mb-2 text-sm text-foreground">&ldquo;{t.text}&rdquo;</p>
          <p className="mb-2 text-xs text-muted">
            <strong>{t.user.name}</strong> ({t.user.email})
            {t.roleOrTitle && ` · ${t.roleOrTitle}`}
          </p>
          <p className="mb-3 text-xs text-muted">
            {new Date(t.createdAt).toLocaleString("es-ES")}
            {t.approved && " · Aprobado"}
          </p>
          <div className="flex gap-2">
            {!t.approved && (
              <button
                type="button"
                onClick={() => setApproved(t.id, true)}
                className="rounded border border-green-600 bg-green-600/20 px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-600/30"
              >
                Aprobar
              </button>
            )}
            {t.approved ? (
              <button
                type="button"
                onClick={() => setApproved(t.id, false)}
                className="rounded border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface"
              >
                Quitar de publicados
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setApproved(t.id, false)}
                className="rounded border border-error/50 bg-error-bg px-3 py-1.5 text-xs font-medium text-error transition-colors hover:opacity-90"
              >
                Rechazar
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
