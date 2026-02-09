import { NextResponse } from "next/server";
import type { DifficultyLevel } from "@prisma/client";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submoduleId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { submoduleId } = await params;
  if (!submoduleId) return badRequest("ID de submódulo requerido");

  const lessons = await prisma.lesson.findMany({
    where: { submoduleId },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { exercises: true } },
    },
  });

  const list = lessons.map((l) => ({
    id: l.id,
    submoduleId: l.submoduleId,
    title: l.title,
    content: l.content,
    order: l.order,
    difficulty: l.difficulty,
    lessonType: l.lessonType ?? "standard",
    exercisesCount: l._count.exercises,
    createdAt: l.createdAt,
  }));

  return NextResponse.json(list);
}

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { submoduleId } = await params;
  if (!submoduleId) return badRequest("ID de submódulo requerido");

  const VALID_DIFFICULTY = ["APRENDIZ", "JUNIOR", "MID", "SENIOR", "ESPECIALISTA"] as const;
  const VALID_LESSON_TYPE = ["standard", "project"] as const;

  try {
    const body = await request.json();
    const { title, content, order, difficulty, lessonType } = body;

    if (!title || typeof title !== "string" || !title.trim()) return badRequest("El título es obligatorio");

    const difficultyValue =
      difficulty != null && typeof difficulty === "string" && VALID_DIFFICULTY.includes(difficulty as typeof VALID_DIFFICULTY[number])
        ? difficulty
        : undefined;

    const lessonTypeValue =
      lessonType != null && typeof lessonType === "string" && VALID_LESSON_TYPE.includes(lessonType as typeof VALID_LESSON_TYPE[number])
        ? lessonType
        : "standard";

    const lesson = await prisma.lesson.create({
      data: {
        submodule: { connect: { id: submoduleId } },
        title: title.trim(),
        content:
          content != null && typeof content === "string" ? content : "",
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
        lessonType: lessonTypeValue,
        ...(difficultyValue !== undefined && { difficulty: difficultyValue as DifficultyLevel }),
      },
    });

    return NextResponse.json(lesson);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2003") return notFound("Submódulo no encontrado");
    if (process.env.NODE_ENV !== "production") console.error("Error al crear lección:", e);
    return serverError("Error al crear la lección");
  }
}
