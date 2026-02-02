"use client";

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
      <p className="rounded border border-zinc-200 px-4 py-8 text-center text-zinc-500 dark:border-zinc-700">
        Cargando…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (students.length === 0) {
    return (
      <p className="rounded border border-zinc-200 px-4 py-8 text-center text-zinc-500 dark:border-zinc-700">
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
    <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-700">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
          <tr>
            <th className="px-4 py-3 font-medium">Alumno</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Lecciones completadas</th>
            <th className="px-4 py-3 font-medium">Última actividad</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr
              key={s.id}
              className="border-b border-zinc-100 dark:border-zinc-700/50"
            >
              <td className="px-4 py-3">{s.name}</td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {s.email}
              </td>
              <td className="px-4 py-3">{s.lessonsCompleted}</td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {formatDate(s.lastActivity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
