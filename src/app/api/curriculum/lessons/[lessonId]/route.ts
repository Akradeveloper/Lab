import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { lessonId } = await params;
  if (!lessonId) return badRequest("ID de lección requerido");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { select: { id: true, title: true } },
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

  if (!lesson) {
    return notFound("Lección no encontrada");
  }

  const exercises = lesson.exercises
    .filter((e) => e.type === "MULTIPLE_CHOICE" || e.type === "TRUE_FALSE")
    .map((e) => ({
      id: e.id,
      type: e.type,
      question: e.question,
      options: parseOptions(e.options),
      order: e.order,
    }));

  const moduleId = lesson.submodule?.module?.id ?? lesson.module?.id ?? "";
  const module_ = lesson.submodule?.module ?? lesson.module;
  const submodule = lesson.submodule
    ? { id: lesson.submodule.id, title: lesson.submodule.title }
    : null;

  return NextResponse.json({
    id: lesson.id,
    moduleId,
    submoduleId: lesson.submoduleId,
    module: module_ ?? null,
    submodule,
    title: lesson.title,
    content: lesson.content,
    order: lesson.order,
    lessonType: lesson.lessonType ?? "standard",
    exercises,
  });
}

function parseOptions(options: string): string[] {
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
