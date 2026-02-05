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
      submodules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, order: true },
          },
        },
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
    let totalCount = 0;
    let completedCount = 0;
    const submodules = mod.submodules.map((sub) => {
      const lessons = sub.lessons.map((l) => {
        const completed = completedLessonIds.has(`${mod.id}:${l.id}`);
        if (completed) completedCount++;
        totalCount++;
        return {
          id: l.id,
          title: l.title,
          order: l.order,
          completed,
        };
      });
      return {
        id: sub.id,
        title: sub.title,
        description: sub.description,
        order: sub.order,
        lessons,
      };
    });

    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      order: mod.order,
      submodules,
      completedCount,
      totalCount,
    };
  });

  return NextResponse.json(list);
}
