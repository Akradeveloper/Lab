import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido" },
      { status: 400 }
    );
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, lessonType: true },
    });

    if (!lesson || (lesson.lessonType ?? "standard") !== "project") {
      return NextResponse.json(
        { error: "Lección no encontrada o no es una lección de proyecto" },
        { status: 404 }
      );
    }

    const submission = await prisma.projectSubmission.findUnique({
      where: {
        userId_lessonId: { userId: session.user.id, lessonId },
      },
    });

    if (!submission) {
      return NextResponse.json({ submission: null });
    }

    return NextResponse.json({
      submission: {
        id: submission.id,
        status: submission.status,
        submissionType: submission.submissionType,
        url: submission.url ?? undefined,
        submittedAt: submission.submittedAt,
        approvedAt: submission.approvedAt ?? undefined,
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al obtener entrega:", e);
    }
    return NextResponse.json(
      { error: "Error al obtener la entrega" },
      { status: 500 }
    );
  }
}
