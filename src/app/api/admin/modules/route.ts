import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const modules = await prisma.module.findMany({
    orderBy: { order: "asc" },
    include: {
      submodules: {
        include: { _count: { select: { lessons: true } } },
      },
      _count: { select: { lessons: true } },
    },
  });

  const list = modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    order: m.order,
    lessonsCount:
      m.submodules.reduce((sum, sm) => sum + sm._count.lessons, 0) +
      m._count.lessons,
    createdAt: m.createdAt,
  }));

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
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

    const module_ = await prisma.module.create({
      data: {
        title: title.trim(),
        description:
          description != null && typeof description === "string"
            ? description.trim() || null
            : null,
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
      },
    });

    return NextResponse.json(module_);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al crear módulo:", e);
    }
    return NextResponse.json(
      { error: "Error al crear el módulo" },
      { status: 500 }
    );
  }
}
