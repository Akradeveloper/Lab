import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ moduleId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { moduleId } = await params;
  if (!moduleId) {
    return NextResponse.json(
      { error: "ID de módulo requerido" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds debe ser un array no vacío de IDs de lección" },
        { status: 400 }
      );
    }

    const ids = orderedIds.filter((x: unknown): x is string => typeof x === "string");
    if (ids.length !== orderedIds.length) {
      return NextResponse.json(
        { error: "Todos los elementos de orderedIds deben ser strings" },
        { status: 400 }
      );
    }

    const module_ = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { _count: { select: { submodules: true } } },
    });
    if (!module_) {
      return NextResponse.json(
        { error: "Módulo no encontrado" },
        { status: 404 }
      );
    }
    if (module_._count.submodules > 0) {
      return NextResponse.json(
        { error: "Este módulo tiene submódulos; reordena desde cada submódulo." },
        { status: 400 }
      );
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId, id: { in: ids } },
      select: { id: true },
    });
    const foundIds = new Set(lessons.map((l) => l.id));
    if (foundIds.size !== ids.length || ids.some((id) => !foundIds.has(id))) {
      return NextResponse.json(
        { error: "Algunos IDs no pertenecen a este módulo o no existen" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      ids.map((lessonId, index) =>
        prisma.lesson.update({
          where: { id: lessonId },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al reordenar lecciones:", e);
    }
    return NextResponse.json(
      { error: "Error al aplicar el orden" },
      { status: 500 }
    );
  }
}
