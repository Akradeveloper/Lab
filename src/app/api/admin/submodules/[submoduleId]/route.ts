import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
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

  const submodule = await prisma.submodule.findUnique({
    where: { id: submoduleId },
    include: { module: { select: { id: true, title: true } } },
  });

  if (!submodule) {
    return NextResponse.json(
      { error: "Submódulo no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...submodule,
    module: submodule.module,
  });
}

export async function PUT(request: Request, { params }: Params) {
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
    const { title, description, order } = body;

    const data: {
      title?: string;
      description?: string | null;
      order?: number;
    } = {};
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

    const submodule = await prisma.submodule.update({
      where: { id: submoduleId },
      data,
    });

    return NextResponse.json(submodule);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Submódulo no encontrado" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al actualizar submódulo:", e);
    }
    return NextResponse.json(
      { error: "Error al actualizar el submódulo" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
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
    await prisma.submodule.delete({
      where: { id: submoduleId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Submódulo no encontrado" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al eliminar submódulo:", e);
    }
    return NextResponse.json(
      { error: "Error al eliminar el submódulo" },
      { status: 500 }
    );
  }
}
