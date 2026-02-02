import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const userId = session.user.id;

  const modules = await prisma.module.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
    },
  });

  const progress = await prisma.progress.findMany({
    where: { userId },
    select: { courseId: true, lessonId: true },
  });

  const completedLessonIds = new Set(
    progress.map((p) => `${p.courseId}:${p.lessonId}`)
  );

  const list = modules.map((mod) => {
    const lessons = mod.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      order: l.order,
      completed: completedLessonIds.has(`${mod.id}:${l.id}`),
    }));
    const completedCount = lessons.filter((l) => l.completed).length;
    const totalCount = lessons.length;

    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      order: mod.order,
      lessons,
      completedCount,
      totalCount,
    };
  });

  return NextResponse.json(list);
}
