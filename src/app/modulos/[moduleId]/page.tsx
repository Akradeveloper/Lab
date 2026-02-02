import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ moduleId: string }> };

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

export default async function ModuloLessonsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { moduleId } = await params;
  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
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
  const completedCount = module_.lessons.filter((l) =>
    completedLessonIds.has(l.id)
  ).length;
  const totalCount = module_.lessons.length;

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
          <p className="mb-4 text-muted">{module_.description}</p>
        )}
        <p className="mb-6 text-sm text-accent">
          {completedCount}/{totalCount} lecciones completadas
        </p>

        {module_.lessons.length === 0 ? (
          <p className="rounded border border-border px-4 py-8 text-center text-muted">
            Este módulo no tiene lecciones todavía.
          </p>
        ) : (
          <ol className="space-y-2">
            {module_.lessons.map((lesson, index) => {
              const completed = completedLessonIds.has(lesson.id);
              return (
                <li key={lesson.id}>
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
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
