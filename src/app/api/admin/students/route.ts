import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

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
