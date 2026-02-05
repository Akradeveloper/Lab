import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { AdminExercisesList } from "../../../../lessons/[lessonId]/admin-exercises-list";

type Props = {
  params: Promise<{ moduleId: string; submoduleId: string; lessonId: string }>;
};

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

export default async function AdminSubmoduleLessonExercisesPage({
  params,
}: Props) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { moduleId, submoduleId, lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      submodule: {
        select: {
          id: true,
          title: true,
          module: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (
    !lesson ||
    lesson.submoduleId !== submoduleId ||
    !lesson.submodule ||
    lesson.submodule.module.id !== moduleId
  )
    notFound();

  const mod = lesson.submodule.module;
  const sub = lesson.submodule;

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
          <span className="mx-2">/</span>
          <Link
            href={`/admin/curriculum/${moduleId}/submodules/${submoduleId}`}
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            {sub.title}
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
