import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ moduleId: string }> };

export async function GET(_request: Request, { params }: Params) {
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

  const submodules = await prisma.submodule.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { lessons: true } },
    },
  });

  const list = submodules.map((s) => ({
    id: s.id,
    moduleId: s.moduleId,
    title: s.title,
    description: s.description,
    order: s.order,
    lessonsCount: s._count.lessons,
    createdAt: s.createdAt,
  }));

  return NextResponse.json(list);
}

export async function POST(request: Request, { params }: Params) {
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

  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { _count: { select: { lessons: true } } },
  });
  if (!module_) {
    return NextResponse.json(
      { error: "Módulo no encontrado" },
      { status: 404 }
    );
  }
  if (module_._count.lessons > 0) {
    return NextResponse.json(
      { error: "Este módulo tiene lecciones directas. No se pueden añadir submódulos; elimina antes las lecciones o usa solo submódulos." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { title, description, order } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const submodule = await prisma.submodule.create({
      data: {
        moduleId,
        title: title.trim(),
        description:
          description != null && typeof description === "string"
            ? description.trim()
            : null,
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
      },
    });

    return NextResponse.json(submodule);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2003") {
      return NextResponse.json(
        { error: "Módulo no encontrado" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al crear submódulo:", e);
    }
    return NextResponse.json(
      { error: "Error al crear el submódulo" },
      { status: 500 }
    );
  }
}
