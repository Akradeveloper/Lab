import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { LessonContent } from "@/components/lesson-content";
import { LessonExercises } from "@/components/lesson-exercises";

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
      submodule: { select: { id: true } },
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

  if (!lesson) notFound();

  if (lesson.submoduleId != null) {
    redirect(
      `/modulos/${moduleId}/submodulos/${lesson.submoduleId}/lecciones/${lessonId}`
    );
  }

  if (lesson.moduleId !== moduleId) notFound();

  const exercisesForClient = lesson.exercises.map((e) => {
    if (e.type === "DESARROLLO") {
      return { id: e.id, type: "DESARROLLO" as const, question: e.question, options: [] as string[], order: e.order };
    }
    if (e.type === "CODE") {
      const codeOpts = parseCodeOptions(e.options);
      return {
        id: e.id,
        type: "CODE" as const,
        question: e.question,
        language: codeOpts.language,
        template: codeOpts.template,
        testCases: codeOpts.testCases,
        order: e.order,
      };
    }
    return {
      id: e.id,
      type: e.type,
      question: e.question,
      options: parseOptions(e.options),
      order: e.order,
    };
  });

  const nextInModule = await prisma.lesson.findFirst({
    where: { moduleId, order: { gt: lesson.order } },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });
  const prevInModule = await prisma.lesson.findFirst({
    where: { moduleId, order: { lt: lesson.order } },
    orderBy: { order: "desc" },
    select: { id: true, title: true },
  });

  const nextLesson = nextInModule
    ? { id: nextInModule.id, title: nextInModule.title }
    : null;
  const prevLesson = prevInModule
    ? { id: prevInModule.id, title: prevInModule.title }
    : null;

  const mod = lesson.module!;

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
          backHref={`/modulos/${moduleId}`}
          backLabel="Volver al módulo"
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

function parseCodeOptions(options: string): {
  language: string;
  template: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
} {
  try {
    const parsed = JSON.parse(options) as Record<string, unknown>;
    const language = typeof parsed?.language === "string" ? parsed.language : "javascript";
    const template = typeof parsed?.template === "string" ? parsed.template : "";
    const testCases = Array.isArray(parsed?.testCases)
      ? (parsed.testCases as Array<{ input?: string; expectedOutput?: string }>).filter(
          (tc) => tc && typeof tc.input === "string" && typeof tc.expectedOutput === "string"
        ).map((tc) => ({ input: tc.input!, expectedOutput: tc.expectedOutput! }))
      : [];
    return { language, template, testCases };
  } catch {
    return { language: "javascript", template: "", testCases: [] };
  }
}
