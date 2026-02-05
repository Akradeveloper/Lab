"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProgressItem = {
  courseId: string;
  lessonId: string;
  completedAt: string;
};

type StudentRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lessonsCompleted: number;
  progress: ProgressItem[];
  lastActivity: string | null;
};

export function AdminStudentsTable() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/students")
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar");
        return res.json();
      })
      .then(setStudents)
      .catch(() => setError("No se pudo cargar el listado"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="rounded border border-border px-4 py-8 text-center text-muted">
        Cargando…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded border border-error bg-error-bg px-4 py-3 text-error">
        {error}
      </p>
    );
  }

  if (students.length === 0) {
    return (
      <p className="rounded border border-border px-4 py-8 text-center text-muted">
        No hay alumnos registrados todavía.
      </p>
    );
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead className="border-b border-border bg-surface">
          <tr>
            <th className="px-4 py-3 font-medium text-foreground">Alumno</th>
            <th className="px-4 py-3 font-medium text-foreground">Email</th>
            <th className="px-4 py-3 font-medium text-foreground">
              Lecciones completadas
            </th>
            <th className="px-4 py-3 font-medium text-foreground">
              Última actividad
            </th>
            <th className="px-4 py-3 font-medium text-foreground">Progreso</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr
              key={s.id}
              className="border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-surface/80"
            >
              <td className="px-4 py-3 text-foreground">{s.name}</td>
              <td className="px-4 py-3 text-muted">{s.email}</td>
              <td className="px-4 py-3 text-foreground">
                {s.lessonsCompleted}
              </td>
              <td className="px-4 py-3 text-muted">
                {formatDate(s.lastActivity)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/alumnos/${s.id}`}
                  className="text-sm font-medium text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                >
                  Ver progreso
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
