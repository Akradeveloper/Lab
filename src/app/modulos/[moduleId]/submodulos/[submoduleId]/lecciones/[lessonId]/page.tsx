import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { LessonContent } from "@/components/lesson-content";
import { LessonExercises } from "@/components/lesson-exercises";

type Props = {
  params: Promise<{
    moduleId: string;
    submoduleId: string;
    lessonId: string;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { title: true },
  });
  return {
    title: lesson ? `${lesson.title} - QA Lab` : "Lección - QA Lab",
  };
}

export default async function LessonPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

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
      exercises: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          question: true,
          options: true,
          order: true,
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

  const exercisesForClient = lesson.exercises
    .filter(
      (e): e is typeof e & { type: "MULTIPLE_CHOICE" | "TRUE_FALSE" } =>
        e.type === "MULTIPLE_CHOICE" || e.type === "TRUE_FALSE"
    )
    .map((e) => ({
      id: e.id,
      type: e.type,
      question: e.question,
      options: parseOptions(e.options),
      order: e.order,
    }));

  // Siguiente: misma submódulo, siguiente por order; si no hay, primera lección del siguiente submódulo
  let nextLesson: {
    id: string;
    title: string;
    submoduleId: string | null;
  } | null = null;
  const nextInSub = await prisma.lesson.findFirst({
    where: { submoduleId, order: { gt: lesson.order } },
    orderBy: { order: "asc" },
    select: { id: true, title: true, submoduleId: true },
  });
  if (nextInSub) {
    nextLesson = nextInSub;
  } else {
    const currentSub = await prisma.submodule.findUnique({
      where: { id: submoduleId },
      select: { order: true },
    });
    const nextSub = await prisma.submodule.findFirst({
      where: { moduleId, order: { gt: currentSub?.order ?? -1 } },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    if (nextSub) {
      const firstInNext = await prisma.lesson.findFirst({
        where: { submoduleId: nextSub.id },
        orderBy: { order: "asc" },
        select: { id: true, title: true, submoduleId: true },
      });
      if (firstInNext) nextLesson = firstInNext;
    }
  }

  // Anterior: misma submódulo, anterior por order; si no hay, última lección del submódulo anterior
  let prevLesson: {
    id: string;
    title: string;
    submoduleId: string | null;
  } | null = null;
  const prevInSub = await prisma.lesson.findFirst({
    where: { submoduleId, order: { lt: lesson.order } },
    orderBy: { order: "desc" },
    select: { id: true, title: true, submoduleId: true },
  });
  if (prevInSub) {
    prevLesson = prevInSub;
  } else {
    const currentSub = await prisma.submodule.findUnique({
      where: { id: submoduleId },
      select: { order: true },
    });
    const prevSub = await prisma.submodule.findFirst({
      where: { moduleId, order: { lt: currentSub?.order ?? 999 } },
      orderBy: { order: "desc" },
      select: { id: true },
    });
    if (prevSub) {
      const lastInPrev = await prisma.lesson.findFirst({
        where: { submoduleId: prevSub.id },
        orderBy: { order: "desc" },
        select: { id: true, title: true, submoduleId: true },
      });
      if (lastInPrev) prevLesson = lastInPrev;
    }
  }

  const mod = lesson.submodule.module;
  const sub = lesson.submodule;

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
            {mod.title}
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/modulos/${moduleId}/submodulos/${submoduleId}`}
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            {sub.title}
          </Link>
        </nav>

        <article className="mb-8">
          <h1 className="mb-2 text-center text-3xl font-bold text-foreground">
            {lesson.title}
          </h1>
          <div className="mb-8 h-px bg-border" aria-hidden />
          <LessonContent content={lesson.content ?? ""} />
        </article>

        <LessonExercises
          moduleId={moduleId}
          lessonId={lessonId}
          exercises={exercisesForClient}
          nextLesson={nextLesson}
          prevLesson={prevLesson}
          backHref={`/modulos/${moduleId}/submodulos/${submoduleId}`}
          backLabel="Volver al submódulo"
        />
      </main>
    </div>
  );
}

function parseOptions(options: string): string[] {
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
