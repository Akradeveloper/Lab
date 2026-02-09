import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ moduleId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { moduleId } = await params;
  if (!moduleId) return badRequest("ID de módulo requerido");

  try {
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return badRequest("orderedIds debe ser un array no vacío de IDs de lección");
    }

    const ids = orderedIds.filter((x: unknown): x is string => typeof x === "string");
    if (ids.length !== orderedIds.length) {
      return badRequest("Todos los elementos de orderedIds deben ser strings");
    }

    const module_ = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { _count: { select: { submodules: true } } },
    });
    if (!module_) return notFound("Módulo no encontrado");
    if (module_._count.submodules > 0) {
      return badRequest("Este módulo tiene submódulos; reordena desde cada submódulo.");
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId, id: { in: ids } },
      select: { id: true },
    });
    const foundIds = new Set(lessons.map((l) => l.id));
    if (foundIds.size !== ids.length || ids.some((id) => !foundIds.has(id))) {
      return badRequest("Algunos IDs no pertenecen a este módulo o no existen");
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
    if (process.env.NODE_ENV !== "production") console.error("Error al reordenar lecciones:", e);
    return serverError("Error al aplicar el orden");
  }
}
