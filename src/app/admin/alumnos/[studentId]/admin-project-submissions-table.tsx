"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SubmissionRow = {
  id: string;
  lessonTitle: string;
  moduleTitle: string;
  status: string;
  submissionType: string;
  url: string | null;
  submittedAt: string;
  approvedAt: string | null;
};

type Props = {
  submissions: SubmissionRow[];
  formatDateTime: (d: Date) => string;
};

export function AdminProjectSubmissionsTable({
  submissions,
  formatDateTime,
}: Props) {
  const router = useRouter();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function handleApprove(submissionId: string) {
    setApprovingId(submissionId);
    try {
      const res = await fetch(
        `/api/admin/project-submissions/${submissionId}/approve`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "Error al aprobar");
        return;
      }
      router.refresh();
    } finally {
      setApprovingId(null);
    }
  }

  if (submissions.length === 0) {
    return (
      <p className="text-muted">Este alumno no tiene entregas de proyectos.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead className="border-b border-border bg-background">
          <tr>
            <th className="px-4 py-3 font-medium text-foreground">Módulo</th>
            <th className="px-4 py-3 font-medium text-foreground">Lección</th>
            <th className="px-4 py-3 font-medium text-foreground">Tipo</th>
            <th className="px-4 py-3 font-medium text-foreground">Entrega</th>
            <th className="px-4 py-3 font-medium text-foreground">Fecha</th>
            <th className="px-4 py-3 font-medium text-foreground">Estado</th>
            <th className="px-4 py-3 font-medium text-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr
              key={s.id}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-4 py-3 text-foreground">{s.moduleTitle}</td>
              <td className="px-4 py-3 text-foreground">{s.lessonTitle}</td>
              <td className="px-4 py-3 text-muted">
                {s.submissionType === "URL" ? "Enlace" : "Archivo"}
              </td>
              <td className="px-4 py-3">
                {s.submissionType === "URL" && s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline transition-colors hover:opacity-80"
                  >
                    Ver repositorio
                  </a>
                ) : s.submissionType === "FILE" ? (
                  <a
                    href={`/api/admin/project-submissions/${s.id}/download`}
                    className="text-accent underline transition-colors hover:opacity-80"
                  >
                    Descargar
                  </a>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">
                {formatDateTime(new Date(s.submittedAt))}
              </td>
              <td className="px-4 py-3">
                {s.status === "PENDING" ? (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                    Pendiente
                  </span>
                ) : s.approvedAt ? (
                  <span className="text-muted">
                    Aprobado ({formatDateTime(new Date(s.approvedAt))})
                  </span>
                ) : (
                  <span className="text-accent">Aprobado</span>
                )}
              </td>
              <td className="px-4 py-3">
                {s.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => handleApprove(s.id)}
                    disabled={approvingId === s.id}
                    className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
                  >
                    {approvingId === s.id ? "Aprobando…" : "Aprobar"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
