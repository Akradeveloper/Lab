import { NextResponse } from "next/server";
import type { DifficultyLevel, Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, unauthorized } from "@/lib/api-responses";
import { handlePrismaError } from "@/lib/prisma-error";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { lessonId } = await params;
  if (!lessonId) return badRequest("ID de lección requerido");

  const VALID_DIFFICULTY = ["APRENDIZ", "JUNIOR", "MID", "SENIOR", "ESPECIALISTA"] as const;
  const VALID_LESSON_TYPE = ["standard", "project"] as const;

  try {
    const body = await request.json();
    const { title, content, order, difficulty, lessonType } = body;

    const data: Prisma.LessonUpdateInput = {};
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) return badRequest("El título no puede estar vacío");
      data.title = title.trim();
    }
    if (content !== undefined) {
      data.content = typeof content === "string" ? content : "";
    }
    if (order !== undefined) {
      if (typeof order !== "number" || !Number.isInteger(order)) return badRequest("El orden debe ser un número entero");
      data.order = order;
    }
    if (difficulty !== undefined) {
      if (difficulty === null || difficulty === "") {
        data.difficulty = null;
      } else if (typeof difficulty === "string" && VALID_DIFFICULTY.includes(difficulty as typeof VALID_DIFFICULTY[number])) {
        data.difficulty = difficulty as DifficultyLevel;
      } else {
        return badRequest("Dificultad no válida; usa APRENDIZ, JUNIOR, MID, SENIOR o ESPECIALISTA");
      }
    }
    if (lessonType !== undefined) {
      if (typeof lessonType === "string" && VALID_LESSON_TYPE.includes(lessonType as typeof VALID_LESSON_TYPE[number])) {
        data.lessonType = lessonType;
      } else {
        return badRequest("Tipo de lección no válido; usa standard o project");
      }
    }

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data,
    });

    return NextResponse.json(lesson);
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Lección no encontrada", context: "Error al actualizar lección:" });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { lessonId } = await params;
  if (!lessonId) return badRequest("ID de lección requerido");

  try {
    await prisma.lesson.delete({
      where: { id: lessonId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Lección no encontrada", context: "Error al eliminar lección:" });
  }
}
