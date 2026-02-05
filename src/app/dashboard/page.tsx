import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import {
  getProgressByModule,
  getNextLessonToContinue,
  getDerivedAchievements,
  buildLessonUrl,
  type ModuleForProfile,
  type LessonInOrder,
} from "@/lib/profile-stats";

export const metadata = {
  title: "Inicio - QA Lab",
  description: "Área del alumno",
};

function formatDateTime(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ModuleWithLessonsForNext = {
  id: string;
  title: string;
  order: number;
  submodules: {
    id: string;
    title: string;
    order: number;
    lessons: {
      id: string;
      title: string;
      moduleId: string | null;
      submoduleId: string | null;
      order: number;
    }[];
  }[];
  lessons: {
    id: string;
    title: string;
    moduleId: string | null;
    submoduleId: string | null;
    order: number;
  }[];
};

function buildOrderedLessons(
  modules: ModuleWithLessonsForNext[]
): LessonInOrder[] {
  const result: LessonInOrder[] = [];
  const byOrder = [...modules].sort((a, b) => a.order - b.order);
  for (const mod of byOrder) {
    if (mod.submodules.length > 0) {
      const subs = [...mod.submodules].sort((a, b) => a.order - b.order);
      for (const sub of subs) {
        const les = [...sub.lessons].sort((a, b) => a.order - b.order);
        for (const l of les) {
          result.push({
            id: l.id,
            title: l.title,
            moduleId: mod.id,
            submoduleId: sub.id,
          });
        }
      }
    } else {
      const les = [...mod.lessons].sort((a, b) => a.order - b.order);
      for (const l of les) {
        result.push({
          id: l.id,
          title: l.title,
          moduleId: mod.id,
          submoduleId: null,
        });
      }
    }
  }
  return result;
}

type PathLessonItem = {
  id: string;
  title: string;
  url: string;
  completed: boolean;
  isNext: boolean;
};

function getActiveContextPath(
  nextLesson: LessonInOrder | null,
  modules: ModuleWithLessonsForNext[],
  progress: { courseId: string; lessonId: string }[]
): { contextTitle: string; lessons: PathLessonItem[] } {
  if (!nextLesson) return { contextTitle: "", lessons: [] };
  const completedSet = new Set(
    progress.map((p) => `${p.courseId}:${p.lessonId}`)
  );
  const mod = modules.find((m) => m.id === nextLesson.moduleId);
  if (!mod) return { contextTitle: "", lessons: [] };

  let contextTitle: string;
  let ordered: { id: string; title: string; order: number }[];

  if (nextLesson.submoduleId) {
    const sub = mod.submodules.find((s) => s.id === nextLesson.submoduleId);
    contextTitle = sub?.title ?? mod.title;
    ordered = sub ? [...sub.lessons].sort((a, b) => a.order - b.order) : [];
  } else {
    contextTitle = mod.title;
    ordered = [...mod.lessons].sort((a, b) => a.order - b.order);
  }

  const lessons: PathLessonItem[] = ordered.map((l) => ({
    id: l.id,
    title: l.title,
    url: buildLessonUrl(nextLesson.moduleId, nextLesson.submoduleId, l.id),
    completed: completedSet.has(`${nextLesson.moduleId}:${l.id}`),
    isNext: l.id === nextLesson.id,
  }));

  return { contextTitle, lessons };
}

function getMotivationalLine(
  hasNextLesson: boolean,
  totalLessonsCompleted: number,
  progressByModule: {
    moduleTitle: string;
    completedCount: number;
    totalCount: number;
  }[],
  totalModules: number
): string {
  if (hasNextLesson) {
    const inProgress = progressByModule.find(
      (p) =>
        p.totalCount > 0 &&
        p.completedCount > 0 &&
        p.completedCount < p.totalCount
    );
    if (inProgress && inProgress.totalCount - inProgress.completedCount === 1) {
      return `Te falta 1 lección para terminar "${inProgress.moduleTitle}".`;
    }
    if (totalLessonsCompleted > 0) {
      return "Continúa donde lo dejaste.";
    }
    return "Tu primera lección te espera.";
  }
  if (totalModules === 0) {
    return "Aún no hay módulos disponibles.";
  }
  return "Has completado el contenido actual. ¡Enhorabuena!";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [progress, modules] = await Promise.all([
    prisma.progress.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      select: { courseId: true, lessonId: true, completedAt: true },
    }),
    prisma.module.findMany({
      orderBy: { order: "asc" },
      include: {
        submodules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                moduleId: true,
                submoduleId: true,
                order: true,
              },
            },
          },
        },
        lessons: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            moduleId: true,
            submoduleId: true,
            order: true,
          },
        },
      },
    }),
  ]);

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

  const orderedLessons = buildOrderedLessons(
    modules as ModuleWithLessonsForNext[]
  );
  const nextLesson = getNextLessonToContinue(progress, orderedLessons);
  const progressByModule = getProgressByModule(progress, modulesForProfile);
  const totalLessonsCompleted = progress.length;
  const modulesCompleted = progressByModule.filter(
    (p) => p.totalCount > 0 && p.completedCount === p.totalCount
  ).length;
  const lastActivity = progress.length > 0 ? progress[0].completedAt : null;
  const achievements = getDerivedAchievements(progress, modulesForProfile);
  const latestAchievement = achievements[0] ?? null;

  const motivationalLine = getMotivationalLine(
    !!nextLesson,
    totalLessonsCompleted,
    progressByModule,
    modules.length
  );

  const moduleTitleForNext = nextLesson
    ? modules.find((m) => m.id === nextLesson.moduleId)?.title ?? ""
    : "";

  const { contextTitle: activeContextTitle, lessons: pathLessons } =
    getActiveContextPath(
      nextLesson,
      modules as ModuleWithLessonsForNext[],
      progress
    );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
        {/* Hero / cabecera */}
        <header className="mb-8" aria-label="Saludo y resumen">
          <h1 className="mb-2 text-2xl font-semibold text-foreground">
            Hola, {session.user?.name ?? "alumno"}.
          </h1>
          <p className="text-muted">{motivationalLine}</p>
        </header>

        {/* Bloque principal: Tu camino (path) o Continúa donde lo dejaste */}
        {pathLessons.length > 0 ? (
          <section
            className="mb-8 rounded-xl border border-border bg-surface p-6 shadow-sm"
            aria-labelledby="dashboard-camino-heading"
          >
            <h2
              id="dashboard-camino-heading"
              className="mb-6 text-lg font-semibold text-foreground"
            >
              Tu camino en {activeContextTitle}
            </h2>
            <ul
              className="relative flex flex-col"
              aria-label="Lecciones del camino"
            >
              {pathLessons.map((lesson, index) => (
                <li
                  key={lesson.id}
                  className="flex gap-4 pb-6 last:pb-0"
                  aria-current={lesson.isNext ? "step" : undefined}
                >
                  {/* Línea vertical + nodo */}
                  <div className="flex flex-col items-center shrink-0 w-6">
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                        lesson.completed
                          ? "border-accent bg-accent"
                          : lesson.isNext
                          ? "border-accent bg-accent ring-4 ring-accent/30 ring-offset-2 ring-offset-surface"
                          : "border-border bg-background"
                      }`}
                      aria-hidden
                    />
                    {index < pathLessons.length - 1 && (
                      <div
                        className={`mt-1 w-0.5 flex-1 min-h-4 ${
                          lesson.completed ? "bg-accent/50" : "bg-border"
                        }`}
                        aria-hidden
                      />
                    )}
                  </div>
                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    {lesson.completed ? (
                      <Link
                        href={lesson.url}
                        className="text-sm font-medium text-muted transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                      >
                        {lesson.title}
                      </Link>
                    ) : lesson.isNext ? (
                      <div>
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          {lesson.title}
                          <span className="ml-2 text-xs font-normal text-accent">
                            Siguiente
                          </span>
                        </p>
                        <Link
                          href={lesson.url}
                          className="inline-block rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          Ir a la lección
                        </Link>
                      </div>
                    ) : (
                      <span className="text-sm text-muted">{lesson.title}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section
            className="mb-8 rounded-xl border border-border bg-surface p-6 shadow-sm"
            aria-labelledby="dashboard-continua-heading"
          >
            <h2
              id="dashboard-continua-heading"
              className="mb-4 text-lg font-semibold text-foreground"
            >
              Continúa donde lo dejaste
            </h2>
            <p className="text-muted">
              {modules.length === 0
                ? "Aún no hay módulos disponibles. Cuando existan, aquí verás la siguiente lección."
                : "Has completado todo el contenido por ahora."}
            </p>
          </section>
        )}

        {/* Resumen compacto */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface px-4 py-3"
          aria-labelledby="dashboard-resumen-heading"
        >
          <h2 id="dashboard-resumen-heading" className="sr-only">
            Resumen de tu progreso
          </h2>
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">
              {totalLessonsCompleted}
            </span>{" "}
            lecciones completadas
            <span className="mx-2" aria-hidden>
              ·
            </span>
            <span className="font-medium text-foreground">
              {modulesCompleted}
            </span>{" "}
            módulos completados
            <span className="mx-2" aria-hidden>
              ·
            </span>
            Última actividad:{" "}
            {lastActivity ? formatDateTime(lastActivity) : "sin actividad aún"}
          </p>
        </section>

        {/* Logro reciente (opcional) */}
        {latestAchievement && (
          <section
            className="mb-8 rounded-lg border border-border bg-surface p-4"
            aria-labelledby="dashboard-logro-heading"
          >
            <h2
              id="dashboard-logro-heading"
              className="mb-2 text-sm font-semibold text-foreground"
            >
              Logro reciente
            </h2>
            <p className="text-sm text-muted">
              {latestAchievement.label}
              <span className="ml-2 text-muted/80">
                ({formatDateTime(latestAchievement.achievedAt)})
              </span>
            </p>
          </section>
        )}

        {/* Enlaces discretos */}
        <p className="text-sm text-muted">
          <Link
            href="/mi-carrera"
            className="transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            Ver mi carrera
          </Link>
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <Link
            href="/modulos"
            className="transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            Módulos
          </Link>
        </p>
      </main>
    </div>
  );
}
