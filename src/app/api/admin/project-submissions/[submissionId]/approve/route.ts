import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submissionId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { submissionId } = await params;
  if (!submissionId) return badRequest("ID de entrega requerido");

  try {
    const submission = await prisma.projectSubmission.findUnique({
      where: { id: submissionId },
      include: {
        lesson: {
          select: {
            id: true,
            moduleId: true,
            submodule: { select: { moduleId: true } },
          },
        },
      },
    });

    if (!submission) return notFound("Entrega no encontrada");

    if (submission.status !== "PENDING") {
      return badRequest("La entrega no está pendiente de revisión");
    }

    const courseId =
      submission.lesson.submodule?.moduleId ?? submission.lesson.moduleId ?? "";

    await prisma.projectSubmission.update({
      where: { id: submissionId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });

    const existingProgress = await prisma.progress.findFirst({
      where: {
        userId: submission.userId,
        courseId,
        lessonId: submission.lessonId,
      },
    });

    if (!existingProgress) {
      await prisma.progress.create({
        data: {
          userId: submission.userId,
          courseId,
          lessonId: submission.lessonId,
        },
      });
    }

    let certificateId: string | null = null;
    try {
      const moduleId = courseId;
      if (moduleId) {
        const moduleLessons = await prisma.lesson.findMany({
          where: {
            OR: [
              { moduleId },
              { submodule: { moduleId } },
            ],
          },
          select: { id: true },
        });
        const allLessonIds = moduleLessons.map((l) => l.id);
        const userProgress = await prisma.progress.findMany({
          where: { userId: submission.userId, courseId: moduleId },
          select: { lessonId: true },
        });
        const completedSet = new Set(userProgress.map((p) => p.lessonId));
        const allCompleted =
          allLessonIds.length > 0 &&
          allLessonIds.every((id) => completedSet.has(id));

        if (allCompleted) {
          const existingCert = await prisma.certificate.findUnique({
            where: { userId_moduleId: { userId: submission.userId, moduleId } },
          });
          if (!existingCert) {
            const cert = await prisma.certificate.create({
              data: { userId: submission.userId, moduleId },
            });
            certificateId = cert.id;
          }
        }
      }
    } catch (certErr) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error al verificar/emitir certificado:", certErr);
      }
    }

    return NextResponse.json({ ok: true, certificateId });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al aprobar entrega:", e);
    }
    return serverError("Error al aprobar la entrega");
  }
}
