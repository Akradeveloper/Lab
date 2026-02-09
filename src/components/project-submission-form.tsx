"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/toast";

type Submission = {
  id: string;
  status: string;
  submissionType: string;
  url?: string;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  canRetryAt?: string;
};

type Props = {
  lessonId: string;
};

export function ProjectSubmissionForm({ lessonId }: Props) {
  const { toast } = useToast();
  const [submission, setSubmission] = useState<Submission | null | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/curriculum/lessons/${lessonId}/project-submission`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.submission !== undefined) {
          setSubmission(data.submission);
        }
      })
      .catch(() => {
        if (!cancelled) setSubmission(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  async function handleSubmitUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast("Escribe la URL del repositorio", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/curriculum/lessons/${lessonId}/project-submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: "url", url: url.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data?.error ?? "Error al enviar la entrega", "error");
        return;
      }
      setSubmission({
        id: data.submission.id,
        status: data.submission.status,
        submissionType: data.submission.submissionType,
        submittedAt: data.submission.submittedAt,
      });
      toast("Entrega enviada correctamente", "success");
      setUrl("");
    } catch {
      toast("Error de conexión", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitFile(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast("Selecciona un archivo comprimido", "error");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(
        `/api/curriculum/lessons/${lessonId}/project-submit`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data?.error ?? "Error al subir el archivo", "error");
        return;
      }
      setSubmission({
        id: data.submission.id,
        status: data.submission.status,
        submissionType: data.submission.submissionType,
        submittedAt: data.submission.submittedAt,
      });
      toast("Archivo subido correctamente", "success");
      setFile(null);
    } catch {
      toast("Error de conexión", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <p className="text-muted">Cargando estado de la entrega…</p>
      </section>
    );
  }

  if (submission?.status === "APPROVED") {
    const approvedAt = submission.approvedAt
      ? new Date(submission.approvedAt).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
    return (
      <section className="rounded-lg border border-accent/50 bg-accent/10 p-6">
        <h3 className="mb-2 text-lg font-semibold text-accent">
          Proyecto aprobado
        </h3>
        <p className="text-sm text-foreground">
          Tu entrega fue aprobada{approvedAt ? ` el ${approvedAt}` : ""}. Esta
          lección está completada.
        </p>
      </section>
    );
  }

  if (submission?.status === "PENDING") {
    const submittedAt = new Date(submission.submittedAt).toLocaleDateString(
      "es-ES",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Entregar proyecto
        </h3>
        <p className="mb-4 text-sm text-muted">
          Entregado el {submittedAt}. Estado: Pendiente de revisión. Puedes
          reenviar si quieres actualizar tu entrega.
        </p>
        <div className="flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              mode === "url"
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            Enviar enlace (URL)
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              mode === "file"
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            Subir archivo
          </button>
        </div>
        {mode === "url" ? (
          <form onSubmit={handleSubmitUrl} className="mt-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                URL del repositorio (ej. GitHub)
              </span>
              <input
                type="url"
                value={String(url ?? "")}
                onChange={(e) => setUrl(e.target.value ?? "")}
                placeholder="https://github.com/usuario/repo"
                className="mt-1 w-full max-w-md rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-3 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar entrega"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitFile} className="mt-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Archivo comprimido (.zip, .tar.gz)
              </span>
              <input
                type="file"
                accept=".zip,.tar.gz,.tgz,.tar"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full max-w-md text-sm text-foreground file:mr-4 file:rounded file:border file:border-accent file:bg-accent/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || !file}
              className="mt-3 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Subiendo…" : "Subir entrega"}
            </button>
          </form>
        )}
      </section>
    );
  }

  if (submission?.status === "REJECTED") {
    const canRetryAt = submission.canRetryAt
      ? new Date(submission.canRetryAt)
      : null;
    const stillInCooldown =
      canRetryAt && Date.now() < canRetryAt.getTime();

    if (stillInCooldown && canRetryAt) {
      const formattedDate = canRetryAt.toLocaleString("es-ES", {
        dateStyle: "long",
        timeStyle: "short",
      });
      return (
        <section className="rounded-lg border border-border bg-surface p-6">
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Entrega no aprobada
          </h3>
          <p className="text-sm text-foreground">
            Tu entrega fue rechazada. Debes esperar un tiempo antes de volver a
            enviar. Podrás volver a enviar a partir del{" "}
            <strong>{formattedDate}</strong>.
          </p>
        </section>
      );
    }

    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Entregar proyecto
        </h3>
        <p className="mb-4 text-sm text-muted">
          Tu entrega fue rechazada. Ya puedes volver a enviar cuando quieras.
        </p>
        <div className="flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              mode === "url"
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            Enviar enlace (URL)
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              mode === "file"
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            Subir archivo
          </button>
        </div>
        {mode === "url" ? (
          <form onSubmit={handleSubmitUrl} className="mt-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                URL del repositorio (ej. GitHub)
              </span>
              <input
                type="url"
                value={String(url ?? "")}
                onChange={(e) => setUrl(e.target.value ?? "")}
                placeholder="https://github.com/usuario/repo"
                className="mt-1 w-full max-w-md rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-3 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar entrega"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitFile} className="mt-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Archivo comprimido (.zip, .tar.gz)
              </span>
              <input
                type="file"
                accept=".zip,.tar.gz,.tgz,.tar"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full max-w-md text-sm text-foreground file:mr-4 file:rounded file:border file:border-accent file:bg-accent/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || !file}
              className="mt-3 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Subiendo…" : "Subir entrega"}
            </button>
          </form>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        Entregar proyecto
      </h3>
      <p className="mb-4 text-sm text-muted">
        Envía la URL de tu repositorio (ej. GitHub) o sube un archivo
        comprimido con tu proyecto.
      </p>
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            mode === "url"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Enviar enlace (URL)
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            mode === "file"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Subir archivo
        </button>
      </div>
      {mode === "url" ? (
        <form onSubmit={handleSubmitUrl} className="mt-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              URL del repositorio (ej. GitHub)
            </span>
            <input
              type="url"
              value={String(url ?? "")}
              onChange={(e) => setUrl(e.target.value ?? "")}
              placeholder="https://github.com/usuario/repo"
              className="mt-1 w-full max-w-md rounded border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Enviando…" : "Enviar entrega"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmitFile} className="mt-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Archivo comprimido (.zip, .tar.gz)
            </span>
            <input
              type="file"
              accept=".zip,.tar.gz,.tgz,.tar"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full max-w-md text-sm text-foreground file:mr-4 file:rounded file:border file:border-accent file:bg-accent/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !file}
            className="mt-3 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Subiendo…" : "Subir entrega"}
          </button>
        </form>
      )}
    </section>
  );
}
