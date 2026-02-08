import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { ModulosFilterList, type ModuleWithStatus } from "@/components/modulos-filter-list";

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

  const modulesWithStatus: ModuleWithStatus[] = modules.map((mod) => {
    const allLessons =
      mod.submodules.length > 0
        ? mod.submodules.flatMap((s) => s.lessons)
        : mod.lessons;
    const completedCount = allLessons.filter((l) =>
      completedSet.has(`${mod.id}:${l.id}`)
    ).length;
    const totalCount = allLessons.length;
    const status: ModuleWithStatus["status"] =
      totalCount === 0
        ? "not_started"
        : completedCount === totalCount
          ? "completed"
          : completedCount > 0
            ? "in_progress"
            : "not_started";
    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      completedCount,
      totalCount,
      status,
    };
  });

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
          <ModulosFilterList modules={modulesWithStatus} />
        )}
      </main>
    </div>
  );
}
