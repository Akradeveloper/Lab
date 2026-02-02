import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido" },
      { status: 400 }
    );
  }

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

  if (!lesson) {
    return NextResponse.json(
      { error: "Lección no encontrada" },
      { status: 404 }
    );
  }

  const exercises = lesson.exercises.map((e) => ({
    id: e.id,
    type: e.type,
    question: e.question,
    options: parseOptions(e.options),
    order: e.order,
  }));

  return NextResponse.json({
    id: lesson.id,
    moduleId: lesson.moduleId,
    module: lesson.module,
    title: lesson.title,
    content: lesson.content,
    order: lesson.order,
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
