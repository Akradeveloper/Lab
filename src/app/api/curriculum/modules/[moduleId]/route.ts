import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ moduleId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { moduleId } = await params;
  if (!moduleId) return badRequest("ID de módulo requerido");

  const userId = session.user.id;

  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
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
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
    },
  });

  if (!module_) {
    return notFound("Módulo no encontrado");
  }

  const progress = await prisma.progress.findMany({
    where: { userId, courseId: moduleId },
    select: { lessonId: true },
  });

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  let totalCount = 0;
  let completedCount = 0;
  const submodules = module_.submodules.map((sub) => ({
    id: sub.id,
    title: sub.title,
    description: sub.description,
    order: sub.order,
    lessons: sub.lessons.map((l) => {
      const completed = completedLessonIds.has(l.id);
      if (completed) completedCount++;
      totalCount++;
      return {
        id: l.id,
        title: l.title,
        order: l.order,
        completed,
      };
    }),
  }));

  const lessons =
    module_.submodules.length === 0
      ? module_.lessons.map((l) => {
          const completed = completedLessonIds.has(l.id);
          if (completed) completedCount++;
          totalCount++;
          return {
            id: l.id,
            title: l.title,
            order: l.order,
            completed,
          };
        })
      : [];

  return NextResponse.json({
    id: module_.id,
    title: module_.title,
    description: module_.description,
    order: module_.order,
    submodules,
    lessons,
    completedCount,
    totalCount,
  });
}
