import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const students = await prisma.user.findMany({
    where: { role: "ALUMNO" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      progress: {
        select: {
          id: true,
          courseId: true,
          lessonId: true,
          completedAt: true,
        },
        orderBy: { completedAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const lastActivity = (progress: { completedAt: Date }[]) =>
    progress.length > 0 ? progress[0].completedAt : null;

  const list = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    createdAt: s.createdAt,
    lessonsCompleted: s.progress.length,
    progress: s.progress.map((p) => ({
      courseId: p.courseId,
      lessonId: p.lessonId,
      completedAt: p.completedAt,
    })),
    lastActivity: lastActivity(s.progress),
  }));

  return NextResponse.json(list);
}
