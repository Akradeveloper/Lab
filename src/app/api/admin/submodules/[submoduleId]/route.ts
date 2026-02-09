import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-responses";
import { handlePrismaError } from "@/lib/prisma-error";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submoduleId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { submoduleId } = await params;
  if (!submoduleId) return badRequest("ID de submódulo requerido");

  const submodule = await prisma.submodule.findUnique({
    where: { id: submoduleId },
    include: { module: { select: { id: true, title: true } } },
  });

  if (!submodule) return notFound("Submódulo no encontrado");

  return NextResponse.json({
    ...submodule,
    module: submodule.module,
  });
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { submoduleId } = await params;
  if (!submoduleId) return badRequest("ID de submódulo requerido");

  try {
    const body = await request.json();
    const { title, description, order } = body;

    const data: {
      title?: string;
      description?: string | null;
      order?: number;
    } = {};
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

    const submodule = await prisma.submodule.update({
      where: { id: submoduleId },
      data,
    });

    return NextResponse.json(submodule);
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Submódulo no encontrado", context: "Error al actualizar submódulo:" });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { submoduleId } = await params;
  if (!submoduleId) return badRequest("ID de submódulo requerido");

  try {
    await prisma.submodule.delete({
      where: { id: submoduleId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Submódulo no encontrado", context: "Error al eliminar submódulo:" });
  }
}
