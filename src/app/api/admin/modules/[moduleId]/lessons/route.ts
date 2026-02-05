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
      { error: "Este módulo tiene submódulos; las lecciones se gestionan por submódulo." },
      { status: 400 }
    );
  }

  const lessons = await prisma.lesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { exercises: true } },
    },
  });

  const list = lessons.map((l) => ({
    id: l.id,
    moduleId: l.moduleId,
    title: l.title,
    content: l.content,
    order: l.order,
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

  const { moduleId } = await params;
  if (!moduleId) {
    return NextResponse.json(
      { error: "ID de módulo requerido" },
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
      { error: "Este módulo tiene submódulos; añade lecciones desde el submódulo." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { title, content, order } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        title: title.trim(),
        content:
          content != null && typeof content === "string" ? content : "",
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
      },
    });

    return NextResponse.json(lesson);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2003") {
      return NextResponse.json(
        { error: "Módulo no encontrado" },
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
