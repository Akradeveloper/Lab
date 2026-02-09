import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { getPreviousLessonIdsInModule } from "@/lib/lesson-order";
import { prisma } from "@/lib/prisma";
import { LessonContent } from "@/components/lesson-content";
import { LessonExercises } from "@/components/lesson-exercises";
import { ProjectSubmissionForm } from "@/components/project-submission-form";
import { CurriculumSidebar, type SidebarModule } from "@/components/curriculum-sidebar";
import { LessonSplitLayout } from "@/components/lesson-split-layout";
import { Breadcrumbs } from "@/components/breadcrumbs";

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

  // Solo exigir lecciones anteriores completadas a alumnos, no a admin
  if (session.user.role !== "ADMIN") {
    const previousIds = await getPreviousLessonIdsInModule(moduleId, lessonId);
    if (previousIds.length > 0) {
      const progress = await prisma.progress.findMany({
        where: { userId: session.user!.id, courseId: moduleId },
        select: { lessonId: true },
      });
      const completedSet = new Set(progress.map((p) => p.lessonId));
      const allPreviousDone = previousIds.every((id) => completedSet.has(id));
      if (!allPreviousDone) {
        redirect(`/modulos/${moduleId}/submodulos/${submoduleId}?bloqueado=1`);
      }
    }
  }

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

  // Árbol del módulo para el sidebar
  const moduleTree = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      title: true,
      lessons: {
        where: { submoduleId: null },
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
      submodules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, order: true },
          },
        },
      },
    },
  });

  const sidebarModule: SidebarModule = moduleTree
    ? {
        id: moduleTree.id,
        title: moduleTree.title,
        submodules: moduleTree.submodules,
        lessons: moduleTree.lessons,
      }
    : { id: moduleId, title: mod.title, submodules: [], lessons: [] };

  // Lecciones completadas del usuario en este módulo
  const userProgress = await prisma.progress.findMany({
    where: { userId: session.user!.id, courseId: moduleId },
    select: { lessonId: true },
  });
  const completedIds = new Set(userProgress.map((p) => p.lessonId));

  const hasCodeExercises = exercisesForClient.some((e) => e.type === "CODE");
  const codeExercises = exercisesForClient.filter((e) => e.type === "CODE");
  const nonCodeExercises = exercisesForClient.filter((e) => e.type !== "CODE");

  const breadcrumbNav = (
    <Breadcrumbs
      items={[
        { label: "Módulos", href: "/modulos" },
        { label: mod.title, href: `/modulos/${moduleId}` },
        { label: sub.title, href: `/modulos/${moduleId}/submodulos/${submoduleId}` },
        { label: lesson.title },
      ]}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <CurriculumSidebar
          module={sidebarModule}
          completedLessonIds={completedIds}
          currentLessonId={lessonId}
          moduleId={moduleId}
        />
        <main id="main-content" className="min-w-0 flex-1">
          {hasCodeExercises ? (
            <>
              <div className="px-4 pt-8 lg:px-8">
                {breadcrumbNav}
              </div>
              <LessonSplitLayout
                left={
                  <div>
                    <article className="mb-8">
                      <h1 className="mb-2 text-center text-3xl font-bold text-foreground">
                        {lesson.title}
                      </h1>
                      {(lesson.lessonType ?? "standard") === "project" && (
                        <p className="mb-2 text-center text-sm font-medium text-accent">
                          Proyecto de fin de módulo
                        </p>
                      )}
                      <div className="mb-8 h-px bg-border" aria-hidden />
                      <LessonContent content={lesson.content ?? ""} />
                    </article>
                    {(lesson.lessonType ?? "standard") === "project" && (
                      <div className="mb-8">
                        <ProjectSubmissionForm lessonId={lessonId} />
                      </div>
                    )}
                    {nonCodeExercises.length > 0 && (
                      <LessonExercises
                        moduleId={moduleId}
                        lessonId={lessonId}
                        exercises={nonCodeExercises}
                        nextLesson={null}
                        prevLesson={null}
                        backHref={`/modulos/${moduleId}/submodulos/${submoduleId}`}
                        backLabel="Volver al submódulo"
                        isProjectLesson={(lesson.lessonType ?? "standard") === "project"}
                      />
                    )}
                  </div>
                }
                right={
                  <LessonExercises
                    moduleId={moduleId}
                    lessonId={lessonId}
                    exercises={codeExercises}
                    isProjectLesson={(lesson.lessonType ?? "standard") === "project"}
                    nextLesson={nextLesson}
                    prevLesson={prevLesson}
                    backHref={`/modulos/${moduleId}/submodulos/${submoduleId}`}
                    backLabel="Volver al submódulo"
                  />
                }
              />
            </>
          ) : (
            <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8">
              {breadcrumbNav}
              <article className="mb-8">
                <h1 className="mb-2 text-center text-3xl font-bold text-foreground">
                  {lesson.title}
                </h1>
                {(lesson.lessonType ?? "standard") === "project" && (
                  <p className="mb-2 text-center text-sm font-medium text-accent">
                    Proyecto de fin de módulo
                  </p>
                )}
                <div className="mb-8 h-px bg-border" aria-hidden />
                <LessonContent content={lesson.content ?? ""} />
              </article>
              {(lesson.lessonType ?? "standard") === "project" && (
                <div className="mb-8">
                  <ProjectSubmissionForm lessonId={lessonId} />
                </div>
              )}
              <LessonExercises
                moduleId={moduleId}
                lessonId={lessonId}
                exercises={exercisesForClient}
                nextLesson={nextLesson}
                prevLesson={prevLesson}
                backHref={`/modulos/${moduleId}/submodulos/${submoduleId}`}
                backLabel="Volver al submódulo"
                isProjectLesson={(lesson.lessonType ?? "standard") === "project"}
              />
            </div>
          )}
        </main>
      </div>
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
