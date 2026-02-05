import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { AdminExercisesList } from "./admin-exercises-list";

type Props = { params: Promise<{ moduleId: string; lessonId: string }> };

export async function generateMetadata({ params }: Props) {
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { title: true },
  });
  return {
    title: lesson
      ? `${lesson.title} - Ejercicios - QA Lab`
      : "Ejercicios - QA Lab",
  };
}

export default async function AdminLessonExercisesPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { moduleId, lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { select: { id: true, title: true } },
      submodule: {
        select: {
          id: true,
          module: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!lesson) notFound();

  if (lesson.submoduleId != null) {
    redirect(
      `/admin/curriculum/${moduleId}/submodules/${lesson.submoduleId}/lessons/${lessonId}`
    );
  }

  if (lesson.moduleId !== moduleId) notFound();

  const mod = lesson.module!;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-6 text-sm text-muted">
          <Link
            href="/admin/curriculum"
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            ← Currículo
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/admin/curriculum/${moduleId}`}
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            {mod.title}
          </Link>
        </nav>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {lesson.title}
        </h1>
        <p className="mb-6 text-muted">Ejercicios de la lección</p>
        <AdminExercisesList
          moduleId={moduleId}
          lessonId={lessonId}
          lessonTitle={lesson.title}
        />
      </main>
    </div>
  );
}
