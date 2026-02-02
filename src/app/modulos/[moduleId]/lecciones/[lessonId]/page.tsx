import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import ReactMarkdown from "react-markdown";
import { LessonExercises } from "./lesson-exercises";

type Props = { params: Promise<{ moduleId: string; lessonId: string }> };

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

  const { moduleId, lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { select: { id: true, title: true } },
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

  if (!lesson || lesson.moduleId !== moduleId) notFound();

  const exercisesForClient = lesson.exercises.map((e) => ({
    id: e.id,
    type: e.type,
    question: e.question,
    options: parseOptions(e.options),
    order: e.order,
  }));

  const nextLesson = await prisma.lesson.findFirst({
    where: { moduleId, order: { gt: lesson.order } },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });

  const prevLesson = await prisma.lesson.findFirst({
    where: { moduleId, order: { lt: lesson.order } },
    orderBy: { order: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-8">
        <nav className="mb-6 text-sm text-muted">
          <Link
            href={`/modulos/${moduleId}`}
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            ← {lesson.module.title}
          </Link>
        </nav>

        <article className="mb-8">
          <h1 className="mb-4 text-2xl font-semibold text-foreground">
            {lesson.title}
          </h1>
          <div className="prose prose-invert max-w-none text-foreground prose-p:text-muted prose-strong:text-foreground">
            <ReactMarkdown>
              {lesson.content || "*Sin contenido.*"}
            </ReactMarkdown>
          </div>
        </article>

        <LessonExercises
          moduleId={moduleId}
          lessonId={lessonId}
          exercises={exercisesForClient}
          nextLesson={nextLesson}
          prevLesson={prevLesson}
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
