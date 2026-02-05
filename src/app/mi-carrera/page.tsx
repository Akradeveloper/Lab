import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import {
  getProgressByModule,
  getDerivedAchievements,
  getRecentActivityItems,
  getProgressTimeSeries,
  type ModuleForProfile,
  type LessonInfoForActivity,
} from "@/lib/profile-stats";
import { ProgressTimeChart } from "./ProgressTimeChart";
import { ProgressByModuleChart } from "./ProgressByModuleChart";
import { CompletionPieChart } from "./CompletionPieChart";

export const metadata = {
  title: "Mi carrera - QA Lab",
  description: "Tu progreso, métricas y logros",
};

const RECENT_ACTIVITY_LIMIT = 10;
const TIME_SERIES_LAST_DAYS = 30;

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

export default async function MiCarreraPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [progress, modules] = await Promise.all([
    prisma.progress.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
    }),
    prisma.module.findMany({
      orderBy: { order: "asc" },
      include: {
        submodules: {
          orderBy: { order: "asc" },
          include: {
            lessons: { orderBy: { order: "asc" }, select: { id: true } },
          },
        },
        lessons: {
          orderBy: { order: "asc" },
          select: { id: true },
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
      lessons: s.lessons,
    })),
    lessons: m.lessons,
  }));

  const progressByModule = getProgressByModule(progress, modulesForProfile);
  const totalLessonsCompleted = progress.length;
  const totalLessonsInCurriculum = progressByModule.reduce(
    (sum, p) => sum + p.totalCount,
    0
  );
  const modulesCompleted = progressByModule.filter(
    (p) => p.totalCount > 0 && p.completedCount === p.totalCount
  ).length;
  const lastActivity = progress.length > 0 ? progress[0].completedAt : null;
  const achievements = getDerivedAchievements(progress, modulesForProfile);
  const timeSeriesData = getProgressTimeSeries(progress, {
    lastDays: TIME_SERIES_LAST_DAYS,
  });

  const recentProgress = progress.slice(0, RECENT_ACTIVITY_LIMIT);
  const recentLessonIds = recentProgress.map((p) => p.lessonId);
  const recentLessons =
    recentLessonIds.length > 0
      ? await prisma.lesson.findMany({
          where: { id: { in: recentLessonIds } },
          select: { id: true, title: true, moduleId: true, submoduleId: true },
        })
      : [];
  const lessonMap = new Map<string, LessonInfoForActivity>(
    recentLessons.map((l) => [
      l.id,
      {
        id: l.id,
        title: l.title,
        moduleId: l.moduleId,
        submoduleId: l.submoduleId,
      },
    ])
  );
  const recentActivity = getRecentActivityItems(recentProgress, lessonMap);

  const chartDataByModule = progressByModule.map((p) => ({
    moduleId: p.moduleId,
    moduleTitle: p.moduleTitle,
    completedCount: p.completedCount,
    totalCount: p.totalCount,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">
          Mi carrera
        </h1>
        <p className="mb-8 text-muted">
          Tu trayectoria, métricas y progreso por módulo.
        </p>

        {/* Métricas en cards */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="carrera-metricas-heading"
        >
          <h2
            id="carrera-metricas-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Métricas
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            <li className="rounded border border-border bg-background p-4">
              <p className="text-2xl font-semibold text-accent">
                {totalLessonsCompleted}
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
                  : "Aún no has completado lecciones"}
              </p>
              <p className="text-sm text-muted">Última actividad</p>
            </li>
          </ul>
        </section>

        {/* Gráfico evolución temporal */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="carrera-evolucion-heading"
        >
          <h2
            id="carrera-evolucion-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Actividad (últimos {TIME_SERIES_LAST_DAYS} días)
          </h2>
          <ProgressTimeChart data={timeSeriesData} />
        </section>

        {/* Gráfico progreso por módulo + donut */}
        <div className="mb-8 grid gap-8 lg:grid-cols-2">
          <section
            className="rounded-lg border border-border bg-surface p-6"
            aria-labelledby="carrera-barras-heading"
          >
            <h2
              id="carrera-barras-heading"
              className="mb-4 text-lg font-semibold text-foreground"
            >
              Progreso por módulo
            </h2>
            {chartDataByModule.length === 0 ? (
              <p className="text-muted">
                Aún no hay módulos. Tu progreso se mostrará aquí.
              </p>
            ) : (
              <ProgressByModuleChart data={chartDataByModule} />
            )}
          </section>
          <section
            className="rounded-lg border border-border bg-surface p-6"
            aria-labelledby="carrera-completitud-heading"
          >
            <h2
              id="carrera-completitud-heading"
              className="mb-4 text-lg font-semibold text-foreground"
            >
              Completitud global
            </h2>
            <CompletionPieChart
              totalCompleted={totalLessonsCompleted}
              totalLessons={totalLessonsInCurriculum}
            />
          </section>
        </div>

        {/* Listado progreso por módulo */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="carrera-listado-heading"
        >
          <h2
            id="carrera-listado-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Avance por módulo
          </h2>
          {progressByModule.length === 0 ? (
            <p className="text-muted">
              Aún no hay módulos disponibles. Cuando existan, verás aquí tu
              avance.
            </p>
          ) : (
            <ul className="space-y-4">
              {progressByModule.map((p) => (
                <li key={p.moduleId}>
                  <Link
                    href={`/modulos/${p.moduleId}`}
                    className="block rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent/50 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <h3 className="font-medium text-foreground">
                      {p.moduleTitle}
                    </h3>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted">{p.description}</p>
                    )}
                    <p className="mt-2 text-sm text-accent">
                      {p.completedCount}/{p.totalCount} lecciones completadas
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Logros */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="carrera-logros-heading"
        >
          <h2
            id="carrera-logros-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Logros
          </h2>
          {achievements.length === 0 ? (
            <p className="text-muted">
              Completa lecciones para desbloquear logros. ¡Tu primera lección te
              dará el primero!
            </p>
          ) : (
            <ul className="space-y-2">
              {achievements.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2"
                >
                  <span className="font-medium text-foreground">{a.label}</span>
                  <span className="text-sm text-muted">
                    {formatDate(a.achievedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Actividad reciente */}
        <section
          className="mb-8 rounded-lg border border-border bg-surface p-6"
          aria-labelledby="carrera-actividad-heading"
        >
          <h2
            id="carrera-actividad-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Actividad reciente
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-muted">
              Aún no hay actividad. Entra en Módulos y completa tu primera
              lección.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((a) => (
                <li key={`${a.lessonId}-${a.completedAt.getTime()}`}>
                  <Link
                    href={a.url}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2 transition-colors hover:border-accent/50 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="font-medium text-foreground">
                      {a.lessonTitle}
                    </span>
                    <span className="text-sm text-muted">
                      {formatDateTime(a.completedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
