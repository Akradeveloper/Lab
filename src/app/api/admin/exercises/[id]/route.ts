import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID de ejercicio requerido" },
      { status: 400 }
    );
  }

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
      if (!["MULTIPLE_CHOICE", "TRUE_FALSE", "CODE", "DESARROLLO"].includes(type)) {
        return NextResponse.json(
          { error: "Tipo de ejercicio inválido" },
          { status: 400 }
        );
      }
      data.type = type;
    }
    if (question !== undefined) {
      if (typeof question !== "string" || !question.trim()) {
        return NextResponse.json(
          { error: "El enunciado no puede estar vacío" },
          { status: 400 }
        );
      }
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
      if (typeof order !== "number" || !Number.isInteger(order)) {
        return NextResponse.json(
          { error: "El orden debe ser un número entero" },
          { status: 400 }
        );
      }
      data.order = order;
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data,
    });

    return NextResponse.json(exercise);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al actualizar ejercicio:", e);
    }
    return NextResponse.json(
      { error: "Error al actualizar el ejercicio" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID de ejercicio requerido" },
      { status: 400 }
    );
  }

  try {
    await prisma.exercise.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al eliminar ejercicio:", e);
    }
    return NextResponse.json(
      { error: "Error al eliminar el ejercicio" },
      { status: 500 }
    );
  }
}
