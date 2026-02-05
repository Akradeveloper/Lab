import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ moduleId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { moduleId } = await params;
  if (!moduleId) {
    return NextResponse.json({ error: "ID de módulo requerido" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, description, order } = body;

    const data: { title?: string; description?: string | null; order?: number } = {};
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json(
          { error: "El título no puede estar vacío" },
          { status: 400 }
        );
      }
      data.title = title.trim();
    }
    if (description !== undefined) {
      data.description =
        description != null && typeof description === "string"
          ? description.trim() || null
          : null;
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

    const module_ = await prisma.module.update({
      where: { id: moduleId },
      data,
    });

    return NextResponse.json(module_);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 });
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al actualizar módulo:", e);
    }
    return NextResponse.json(
      { error: "Error al actualizar el módulo" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { moduleId } = await params;
  if (!moduleId) {
    return NextResponse.json({ error: "ID de módulo requerido" }, { status: 400 });
  }

  try {
    await prisma.module.delete({
      where: { id: moduleId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 });
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al eliminar módulo:", e);
    }
    return NextResponse.json(
      { error: "Error al eliminar el módulo" },
      { status: 500 }
    );
  }
}
