import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido" },
      { status: 400 }
    );
  }

  const VALID_DIFFICULTY = ["APRENDIZ", "JUNIOR", "MID", "SENIOR", "ESPECIALISTA"] as const;

  try {
    const body = await request.json();
    const { title, content, order, difficulty } = body;

    const data: Prisma.LessonUpdateInput = {};
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json(
          { error: "El título no puede estar vacío" },
          { status: 400 }
        );
      }
      data.title = title.trim();
    }
    if (content !== undefined) {
      data.content = typeof content === "string" ? content : "";
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
    if (difficulty !== undefined) {
      if (difficulty === null || difficulty === "") {
        data.difficulty = null;
      } else if (typeof difficulty === "string" && VALID_DIFFICULTY.includes(difficulty as typeof VALID_DIFFICULTY[number])) {
        data.difficulty = difficulty;
      } else {
        return NextResponse.json(
          { error: "Dificultad no válida; usa APRENDIZ, JUNIOR, MID, SENIOR o ESPECIALISTA" },
          { status: 400 }
        );
      }
    }

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data,
    });

    return NextResponse.json(lesson);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al actualizar lección:", e);
    }
    return NextResponse.json(
      { error: "Error al actualizar la lección" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido" },
      { status: 400 }
    );
  }

  try {
    await prisma.lesson.delete({
      where: { id: lessonId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al eliminar lección:", e);
    }
    return NextResponse.json(
      { error: "Error al eliminar la lección" },
      { status: 500 }
    );
  }
}
