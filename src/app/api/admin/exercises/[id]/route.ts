import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, unauthorized } from "@/lib/api-responses";
import { handlePrismaError } from "@/lib/prisma-error";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("ID de ejercicio requerido");

  try {
    const body = await request.json();
    const { type, question, options, correctAnswer, order } = body;

    const data: {
      type?: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "CODE" | "DESARROLLO";
      question?: string;
      options?: string;
      correctAnswer?: string;
      order?: number;
    } = {};

    if (type !== undefined) {
      if (!["MULTIPLE_CHOICE", "TRUE_FALSE", "CODE", "DESARROLLO"].includes(type)) return badRequest("Tipo de ejercicio inválido");
      data.type = type;
    }
    if (question !== undefined) {
      if (typeof question !== "string" || !question.trim()) return badRequest("El enunciado no puede estar vacío");
      data.question = question.trim();
    }
    if (options !== undefined) {
      if (typeof options === "string") {
        data.options = options;
      } else if (Array.isArray(options)) {
        data.options = JSON.stringify(options);
      } else if (options !== null && typeof options === "object") {
        data.options = JSON.stringify(options);
      } else {
        data.options = "[]";
      }
    }
    if (correctAnswer !== undefined) {
      const exType = type ?? body.type;
      if (exType === "CODE") {
        data.correctAnswer =
          typeof correctAnswer === "string" ? correctAnswer : "";
      } else if (exType === "DESARROLLO") {
        data.correctAnswer = "";
      } else if (exType === "TRUE_FALSE") {
        data.correctAnswer =
          correctAnswer === true || correctAnswer === "true"
            ? JSON.stringify(true)
            : JSON.stringify(false);
      } else {
        data.correctAnswer =
          typeof correctAnswer === "number" && Number.isInteger(correctAnswer)
            ? JSON.stringify(correctAnswer)
            : JSON.stringify(0);
      }
    }
    if (order !== undefined) {
      if (typeof order !== "number" || !Number.isInteger(order)) return badRequest("El orden debe ser un número entero");
      data.order = order;
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data,
    });

    return NextResponse.json(exercise);
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Ejercicio no encontrado", context: "Error al actualizar ejercicio:" });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("ID de ejercicio requerido");

  try {
    await prisma.exercise.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Ejercicio no encontrado", context: "Error al eliminar ejercicio:" });
  }
}
