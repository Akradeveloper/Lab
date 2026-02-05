import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { DifficultyLevel } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submoduleId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { submoduleId } = await params;
  if (!submoduleId) {
    return NextResponse.json(
      { error: "ID de submódulo requerido" },
      { status: 400 }
    );
  }

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
    exercisesCount: l._count.exercises,
    createdAt: l.createdAt,
  }));

  return NextResponse.json(list);
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { submoduleId } = await params;
  if (!submoduleId) {
    return NextResponse.json(
      { error: "ID de submódulo requerido" },
      { status: 400 }
    );
  }

  const VALID_DIFFICULTY = ["APRENDIZ", "JUNIOR", "MID", "SENIOR", "ESPECIALISTA"] as const;

  try {
    const body = await request.json();
    const { title, content, order, difficulty } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const difficultyValue =
      difficulty != null && typeof difficulty === "string" && VALID_DIFFICULTY.includes(difficulty as typeof VALID_DIFFICULTY[number])
        ? difficulty
        : undefined;

    const lesson = await prisma.lesson.create({
      data: {
        submoduleId,
        title: title.trim(),
        content:
          content != null && typeof content === "string" ? content : "",
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
        ...(difficultyValue !== undefined && { difficulty: difficultyValue as DifficultyLevel }),
      },
    });

    return NextResponse.json(lesson);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2003") {
      return NextResponse.json(
        { error: "Submódulo no encontrado" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al crear lección:", e);
    }
    return NextResponse.json(
      { error: "Error al crear la lección" },
      { status: 500 }
    );
  }
}
