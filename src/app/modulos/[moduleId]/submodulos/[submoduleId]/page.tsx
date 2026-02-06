import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { DescriptionMarkdown } from "@/components/description-markdown";
import { Header } from "@/components/Header";
import { getOrderedLessonIdsInModule } from "@/lib/lesson-order";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ moduleId: string; submoduleId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props) {
  const { submoduleId } = await params;
  const sub = await prisma.submodule.findUnique({
    where: { id: submoduleId },
    select: { title: true },
  });
  return {
    title: sub ? `${sub.title} - QA Lab` : "Lecciones - QA Lab",
  };
}

export default async function SubmoduloLessonsPage({
  params,
  searchParams,
}: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { moduleId, submoduleId } = await params;
  const sp = await searchParams;
  const showBloqueado = sp?.bloqueado === "1";
  const submodule = await prisma.submodule.findUnique({
    where: { id: submoduleId },
    include: {
      module: { select: { id: true, title: true } },
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
    },
  });

  if (!submodule || submodule.moduleId !== moduleId) notFound();

  const progress = await prisma.progress.findMany({
    where: { userId: session.user!.id, courseId: moduleId },
    select: { lessonId: true },
  });

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));
  const completedCount = submodule.lessons.filter((l) =>
    completedLessonIds.has(l.id)
  ).length;
  const totalCount = submodule.lessons.length;
  const orderedIdsInModule = await getOrderedLessonIdsInModule(moduleId);
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-8">
        <nav className="mb-6 text-sm text-muted">
          <Link
            href="/modulos"
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            ← Módulos
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/modulos/${moduleId}`}
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            {submodule.module.title}
          </Link>
        </nav>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {submodule.title}
        </h1>
        {submodule.description && (
          <DescriptionMarkdown
            content={submodule.description}
            className="mb-4"
          />
        )}
        <p className="mb-6 text-sm text-accent">
          {completedCount}/{totalCount} lecciones completadas
        </p>

        {showBloqueado && (
          <p className="mb-4 rounded border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            Debes completar las lecciones anteriores para acceder a la siguiente.
          </p>
        )}

        {submodule.lessons.length === 0 ? (
          <p className="rounded border border-border px-4 py-8 text-center text-muted">
            Este submódulo no tiene lecciones todavía.
          </p>
        ) : (
          <ol className="space-y-2">
            {submodule.lessons.map((lesson) => {
              const completed = completedLessonIds.has(lesson.id);
              const indexInModule = orderedIdsInModule.indexOf(lesson.id);
              const previousIds = orderedIdsInModule.slice(0, indexInModule);
              const unlocked =
                isAdmin ||
                (indexInModule >= 0 &&
                  previousIds.every((id) => completedLessonIds.has(id)));
              return (
                <li key={lesson.id}>
                  {unlocked ? (
                    <Link
                      href={`/modulos/${moduleId}/submodulos/${submoduleId}/lecciones/${lesson.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/50 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                          completed
                            ? "bg-accent/20 text-accent"
                            : "bg-surface border border-border text-muted"
                        }`}
                      >
                        {completed
                          ? "✓"
                          : submodule.lessons.indexOf(lesson) + 1}
                      </span>
                      <span className="font-medium text-foreground">
                        {lesson.title}
                      </span>
                      {completed && (
                        <span className="ml-auto text-sm text-accent">
                          Completada
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-border bg-surface/60 px-4 py-3 text-muted"
                      aria-disabled="true"
                      title="Completa la lección anterior"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm font-medium">
                        {submodule.lessons.indexOf(lesson) + 1}
                      </span>
                      <span className="font-medium">{lesson.title}</span>
                      <span className="ml-auto text-sm">
                        Completa la lección anterior
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
