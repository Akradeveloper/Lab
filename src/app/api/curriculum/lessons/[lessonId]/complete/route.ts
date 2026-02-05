import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function POST(_request: Request, { params }: Params) {
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

  const userId = session.user.id;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        moduleId: true,
        submodule: { select: { moduleId: true } },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 }
      );
    }

    const courseId = lesson.submodule?.moduleId ?? lesson.moduleId ?? "";

    const existing = await prisma.progress.findFirst({
      where: {
        userId,
        courseId,
        lessonId: lesson.id,
      },
    });

    if (existing) {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    await prisma.progress.create({
      data: {
        userId,
        courseId,
        lessonId: lesson.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al marcar lección completada:", e);
    }
    return NextResponse.json(
      { error: "Error al guardar el progreso" },
      { status: 500 }
    );
  }
}
