import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submoduleId: string }> };

export async function PATCH(request: Request, { params }: Params) {
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

    const submodule = await prisma.submodule.findUnique({
      where: { id: submoduleId },
    });
    if (!submodule) {
      return NextResponse.json(
        { error: "Submódulo no encontrado" },
        { status: 404 }
      );
    }

    const lessons = await prisma.lesson.findMany({
      where: { submoduleId, id: { in: ids } },
      select: { id: true },
    });
    const foundIds = new Set(lessons.map((l) => l.id));
    if (foundIds.size !== ids.length || ids.some((id) => !foundIds.has(id))) {
      return NextResponse.json(
        { error: "Algunos IDs no pertenecen a este submódulo o no existen" },
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
