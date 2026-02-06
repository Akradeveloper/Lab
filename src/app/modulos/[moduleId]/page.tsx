import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { DescriptionMarkdown } from "@/components/description-markdown";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ moduleId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props) {
  const { moduleId } = await params;
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { title: true },
  });
  return {
    title: mod ? `${mod.title} - Módulos - QA Lab` : "Módulos - QA Lab",
  };
}

export default async function ModuloPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { moduleId } = await params;
  const sp = await searchParams;
  const showBloqueado = sp?.bloqueado === "1";
  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      submodules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, order: true },
          },
        },
      },
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
    },
  });

  if (!module_) notFound();

  const progress = await prisma.progress.findMany({
    where: { userId: session.user!.id, courseId: moduleId },
    select: { lessonId: true },
  });

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));
  let totalCount = 0;
  let completedCount = 0;
  const isAdmin = session.user.role === "ADMIN";

  const hasSubmodules = module_.submodules.length > 0;

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
        </nav>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {module_.title}
        </h1>
        {module_.description && (
          <DescriptionMarkdown
            content={module_.description}
            className="mb-4"
          />
        )}

        {showBloqueado && (
          <p className="mb-4 rounded border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            Debes completar las lecciones anteriores para acceder a la siguiente.
          </p>
        )}

        {hasSubmodules ? (
          <>
            {module_.submodules.map((sub) => {
              const subCompleted = sub.lessons.filter((l) =>
                completedLessonIds.has(l.id)
              ).length;
              const subTotal = sub.lessons.length;
              totalCount += subTotal;
              completedCount += subCompleted;
              return (
                <div
                  key={sub.id}
                  className="mb-6 rounded-lg border border-border bg-surface p-4"
                >
                  <h2 className="mb-1 font-medium text-foreground">
                    {sub.title}
                  </h2>
                  {sub.description && (
                    <DescriptionMarkdown
                      content={sub.description}
                      className="mb-3 text-sm"
                    />
                  )}
                  <p className="mb-3 text-sm text-accent">
                    {subCompleted}/{subTotal} lecciones completadas
                  </p>
                  <Link
                    href={`/modulos/${moduleId}/submodulos/${sub.id}`}
                    className="inline-block rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Ver lecciones
                  </Link>
                </div>
              );
            })}
            <p className="mt-4 text-sm text-accent">
              {completedCount}/{totalCount} lecciones completadas en total
            </p>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-accent">
              {
                module_.lessons.filter((l) => completedLessonIds.has(l.id))
                  .length
              }
              /{module_.lessons.length} lecciones completadas
            </p>
            {module_.lessons.length === 0 ? (
              <p className="rounded border border-border px-4 py-8 text-center text-muted">
                Este módulo no tiene lecciones todavía.
              </p>
            ) : (
              <ol className="space-y-2">
                {module_.lessons.map((lesson, index) => {
                  const completed = completedLessonIds.has(lesson.id);
                  const orderedIds = module_.lessons.map((l) => l.id);
                  const previousIds = orderedIds.slice(0, index);
                  const unlocked =
                    isAdmin ||
                    previousIds.every((id) => completedLessonIds.has(id));
                  return (
                    <li key={lesson.id}>
                      {unlocked ? (
                        <Link
                          href={`/modulos/${moduleId}/lecciones/${lesson.id}`}
                          className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/50 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                              completed
                                ? "bg-accent/20 text-accent"
                                : "bg-surface border border-border text-muted"
                            }`}
                          >
                            {completed ? "✓" : index + 1}
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
                            {index + 1}
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
          </>
        )}
      </main>
    </div>
  );
}
