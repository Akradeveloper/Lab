import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getProgressByModule,
  type ModuleForProfile,
} from "@/lib/profile-stats";

type Props = { params: Promise<{ studentId: string }> };

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateMetadata({ params }: Props) {
  const { studentId } = await params;
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, role: true },
  });
  if (!student || student.role !== "ALUMNO") {
    return { title: "Alumno no encontrado - Panel de administración" };
  }
  return {
    title: `Progreso de ${student.name} - Alumnos - Panel de administración`,
  };
}

export default async function AdminStudentProgressPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { studentId } = await params;

  const [student, progress, modules, lessonCheckAttempts, exerciseAttempts] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.progress.findMany({
        where: { userId: studentId },
        orderBy: { completedAt: "desc" },
      }),
      prisma.module.findMany({
        orderBy: { order: "asc" },
        include: {
          submodules: {
            orderBy: { order: "asc" },
            include: {
              lessons: {
                orderBy: { order: "asc" },
                select: { id: true, title: true },
              },
            },
          },
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true },
          },
        },
      }),
      prisma.lessonCheckAttempt.findMany({
        where: { userId: studentId },
        select: { lessonId: true, allCorrect: true },
      }),
      prisma.exerciseAttempt.findMany({
        where: { userId: studentId },
        include: {
          exercise: {
            select: { id: true, question: true, order: true, lessonId: true },
          },
        },
      }),
    ]);

  if (!student || student.role !== "ALUMNO") notFound();

  const modulesForProfile: ModuleForProfile[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    order: m.order,
    submodules: m.submodules.map((s) => ({
      id: s.id,
      lessons: s.lessons.map((l) => ({ id: l.id })),
    })),
    lessons: m.lessons.map((l) => ({ id: l.id })),
  }));

  const lessonTitleMap = new Map<
    string,
    { lessonTitle: string; moduleTitle: string }
  >();
  for (const mod of modules) {
    for (const les of mod.lessons) {
      lessonTitleMap.set(les.id, {
        lessonTitle: les.title,
        moduleTitle: mod.title,
      });
    }
    for (const sub of mod.submodules) {
      for (const les of sub.lessons) {
        lessonTitleMap.set(les.id, {
          lessonTitle: les.title,
          moduleTitle: mod.title,
        });
      }
    }
  }

  const progressByModule = getProgressByModule(progress, modulesForProfile);
  const modulesCompleted = progressByModule.filter(
    (p) => p.totalCount > 0 && p.completedCount === p.totalCount
  ).length;
  const lessonsCompletedCount = progress.length;
  const lastActivity = progress.length > 0 ? progress[0].completedAt : null;

  const completedLessonsList = progress.map((p) => {
    const info = lessonTitleMap.get(p.lessonId);
    return {
      moduleTitle: info?.moduleTitle ?? "—",
      lessonTitle: info?.lessonTitle ?? "—",
      completedAt: p.completedAt,
    };
  });

  const reintentosByLesson = new Map<string, number>();
  for (const a of lessonCheckAttempts) {
    if (!a.allCorrect) {
      reintentosByLesson.set(
        a.lessonId,
        (reintentosByLesson.get(a.lessonId) ?? 0) + 1
      );
    }
  }
  const reintentosList = Array.from(reintentosByLesson.entries())
    .map(([lessonId, retries]) => {
      const info = lessonTitleMap.get(lessonId);
      return {
        lessonId,
        lessonTitle: info?.lessonTitle ?? "—",
        moduleTitle: info?.moduleTitle ?? "—",
        retries,
      };
    })
    .filter((r) => r.retries > 0)
    .sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle));

  const fallosByExercise = new Map<
    string,
    { lessonId: string; question: string; order: number; count: number }
  >();
  for (const a of exerciseAttempts) {
    if (!a.correct && a.exercise) {
      const key = a.exerciseId;
      const prev = fallosByExercise.get(key);
      if (prev) {
        fallosByExercise.set(key, { ...prev, count: prev.count + 1 });
      } else {
        fallosByExercise.set(key, {
          lessonId: a.exercise.lessonId ?? "",
          question: a.exercise.question,
          order: a.exercise.order,
          count: 1,
        });
      }
    }
  }
  const fallosList = Array.from(fallosByExercise.entries())
    .map(([exerciseId, data]) => {
      const info = data.lessonId ? lessonTitleMap.get(data.lessonId) : null;
      return {
        exerciseId,
        lessonTitle: info?.lessonTitle ?? "—",
        moduleTitle: info?.moduleTitle ?? "—",
        exerciseTitle:
          data.question.length > 60
            ? data.question.slice(0, 57) + "…"
            : data.question,
        order: data.order,
        lessonId: data.lessonId,
        failures: data.count,
      };
    })
    .sort((a, b) => {
      const byLesson = (a.moduleTitle + a.lessonTitle).localeCompare(
        b.moduleTitle + b.lessonTitle
      );
      return byLesson !== 0 ? byLesson : a.order - b.order;
    });

  return (
    <>
      <nav className="mb-6 text-sm text-muted">
        <Link
          href="/admin/alumnos"
          className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          ← Volver a Alumnos
        </Link>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Progreso de {student.name}
      </h1>

      {/* Datos del alumno */}
      <section
        className="mb-8 rounded-lg border border-border bg-surface p-6"
        aria-labelledby="alumno-datos-heading"
      >
        <h2
          id="alumno-datos-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Datos del alumno
        </h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted">Nombre</dt>
            <dd className="font-medium text-foreground">{student.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="font-medium text-foreground">{student.email}</dd>
          </div>
          {student.createdAt && (
            <div>
              <dt className="text-muted">Miembro desde</dt>
              <dd className="font-medium text-foreground">
                {formatDate(student.createdAt)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Métricas */}
      <section
        className="mb-8 rounded-lg border border-border bg-surface p-6"
        aria-labelledby="alumno-metricas-heading"
      >
        <h2
          id="alumno-metricas-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Métricas
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          <li className="rounded border border-border bg-background p-4">
            <p className="text-2xl font-semibold text-accent">
              {lessonsCompletedCount}
            </p>
            <p className="text-sm text-muted">Lecciones completadas</p>
          </li>
          <li className="rounded border border-border bg-background p-4">
            <p className="text-2xl font-semibold text-accent">
              {modulesCompleted}
            </p>
            <p className="text-sm text-muted">Módulos completados</p>
          </li>
          <li className="rounded border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              {lastActivity
                ? formatDateTime(lastActivity)
                : "Sin actividad aún"}
            </p>
            <p className="text-sm text-muted">Última actividad</p>
          </li>
        </ul>
      </section>

      {/* Progreso por módulo */}
      <section
        className="mb-8 rounded-lg border border-border bg-surface p-6"
        aria-labelledby="alumno-progreso-modulo-heading"
      >
        <h2
          id="alumno-progreso-modulo-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Progreso por módulo
        </h2>
        {progressByModule.length === 0 ? (
          <p className="text-muted">
            No hay módulos en el currículo o no hay progreso.
          </p>
        ) : (
          <ul className="space-y-2">
            {progressByModule.map((p) => (
              <li
                key={p.moduleId}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2"
              >
                <span className="font-medium text-foreground">
                  {p.moduleTitle}
                </span>
                <span className="text-sm text-accent">
                  {p.completedCount}/{p.totalCount} lecciones completadas
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lecciones completadas */}
      <section
        className="mb-8 rounded-lg border border-border bg-surface p-6"
        aria-labelledby="alumno-lecciones-heading"
      >
        <h2
          id="alumno-lecciones-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Lecciones completadas
        </h2>
        {completedLessonsList.length === 0 ? (
          <p className="text-muted">Sin lecciones completadas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Módulo
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Lección
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {completedLessonsList.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {row.moduleTitle}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {row.lessonTitle}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDateTime(row.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reintentos por lección */}
      <section
        className="mb-8 rounded-lg border border-border bg-surface p-6"
        aria-labelledby="alumno-reintentos-heading"
      >
        <h2
          id="alumno-reintentos-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Reintentos por lección
        </h2>
        <p className="mb-4 text-sm text-muted">
          Veces que el alumno pulsó &quot;Comprobar&quot; y no acertó todas las
          respuestas (antes de completar la lección).
        </p>
        {reintentosList.length === 0 ? (
          <p className="text-muted">
            No hay reintentos registrados para este alumno.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[300px] text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Módulo
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Lección
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Reintentos
                  </th>
                </tr>
              </thead>
              <tbody>
                {reintentosList.map((r) => (
                  <tr
                    key={r.lessonId}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {r.moduleTitle}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {r.lessonTitle}
                    </td>
                    <td className="px-4 py-3 text-accent">{r.retries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Fallos por ejercicio */}
      <section
        className="mb-8 rounded-lg border border-border bg-surface p-6"
        aria-labelledby="alumno-fallos-heading"
      >
        <h2
          id="alumno-fallos-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Fallos por ejercicio
        </h2>
        <p className="mb-4 text-sm text-muted">
          Número de veces que falló cada ejercicio al comprobar.
        </p>
        {fallosList.length === 0 ? (
          <p className="text-muted">
            No hay fallos registrados para este alumno.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Lección
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Ejercicio
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Fallos
                  </th>
                </tr>
              </thead>
              <tbody>
                {fallosList.map((f) => (
                  <tr
                    key={f.exerciseId}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {f.moduleTitle} / {f.lessonTitle}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {f.exerciseTitle}
                    </td>
                    <td className="px-4 py-3 text-accent">{f.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
