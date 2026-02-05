import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Módulos - QA Lab",
  description: "Currículo de QA Lab",
};

export default async function ModulosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const modules = await prisma.module.findMany({
    orderBy: { order: "asc" },
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

  const progress = await prisma.progress.findMany({
    where: { userId: session.user!.id },
    select: { courseId: true, lessonId: true },
  });

  const completedSet = new Set(
    progress.map((p) => `${p.courseId}:${p.lessonId}`)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Módulos</h1>
        <p className="mb-6 text-muted">
          Elige un módulo y avanza lección a lección. Completa los ejercicios
          para marcar tu progreso.
        </p>

        {modules.length === 0 ? (
          <p className="rounded border border-border px-4 py-8 text-center text-muted">
            Aún no hay módulos disponibles.
          </p>
        ) : (
          <ul className="space-y-4">
            {modules.map((mod) => {
              const allLessons =
                mod.submodules.length > 0
                  ? mod.submodules.flatMap((s) => s.lessons)
                  : mod.lessons;
              const completedCount = allLessons.filter((l) =>
                completedSet.has(`${mod.id}:${l.id}`)
              ).length;
              const totalCount = allLessons.length;
              return (
                <li key={mod.id}>
                  <Link
                    href={`/modulos/${mod.id}`}
                    className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <h2 className="font-semibold text-foreground">
                      {mod.title}
                    </h2>
                    {mod.description && (
                      <p className="mt-1 text-sm text-muted">
                        {mod.description}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-accent">
                      {completedCount}/{totalCount} lecciones completadas
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
