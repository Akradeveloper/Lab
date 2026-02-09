import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, unauthorized } from "@/lib/api-responses";
import { handlePrismaError } from "@/lib/prisma-error";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ moduleId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { moduleId } = await params;
  if (!moduleId) return badRequest("ID de módulo requerido");

  try {
    const body = await request.json();
    const { title, description, order } = body;

    const data: { title?: string; description?: string | null; order?: number } = {};
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) return badRequest("El título no puede estar vacío");
      data.title = title.trim();
    }
    if (description !== undefined) {
      data.description =
        description != null && typeof description === "string"
          ? description.trim() || null
          : null;
    }
    if (order !== undefined) {
      if (typeof order !== "number" || !Number.isInteger(order)) return badRequest("El orden debe ser un número entero");
      data.order = order;
    }

    const module_ = await prisma.module.update({
      where: { id: moduleId },
      data,
    });

    return NextResponse.json(module_);
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Módulo no encontrado", context: "Error al actualizar módulo:" });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { moduleId } = await params;
  if (!moduleId) return badRequest("ID de módulo requerido");

  try {
    await prisma.module.delete({
      where: { id: moduleId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Módulo no encontrado", context: "Error al eliminar módulo:" });
  }
}
