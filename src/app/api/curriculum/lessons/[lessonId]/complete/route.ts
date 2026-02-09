import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { lessonId } = await params;
  if (!lessonId) return badRequest("ID de lección requerido");

  const userId = session.user.id;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        lessonType: true,
        moduleId: true,
        submodule: { select: { moduleId: true } },
      },
    });

    if (!lesson) return notFound("Lección no encontrada");

    if ((lesson.lessonType ?? "standard") === "project" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Las lecciones tipo proyecto se completan cuando un administrador aprueba tu entrega." },
        { status: 403 }
      );
    }

    const courseId = lesson.submodule?.moduleId ?? lesson.moduleId ?? "";

    const existing = await prisma.progress.findFirst({
      where: {
        userId,
        courseId,
        lessonId: lesson.id,
      },
    });

    if (existing) {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    await prisma.progress.create({
      data: {
        userId,
        courseId,
        lessonId: lesson.id,
      },
    });

    // Verificar si se ha completado el módulo entero para emitir certificado
    let certificateId: string | null = null;
    try {
      const moduleId = courseId;
      if (moduleId) {
        // Obtener todas las lecciones del módulo (directas + submódulos)
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

        // Obtener progreso del usuario en este módulo
        const userProgress = await prisma.progress.findMany({
          where: { userId, courseId: moduleId },
          select: { lessonId: true },
        });
        const completedSet = new Set(userProgress.map((p) => p.lessonId));
        const allCompleted = allLessonIds.length > 0 && allLessonIds.every((id) => completedSet.has(id));

        if (allCompleted) {
          // Verificar si ya tiene certificado
          const existingCert = await prisma.certificate.findUnique({
            where: { userId_moduleId: { userId, moduleId } },
          });

          if (!existingCert) {
            const cert = await prisma.certificate.create({
              data: { userId, moduleId },
            });
            certificateId = cert.id;
          } else {
            certificateId = existingCert.id;
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
      console.error("Error al marcar lección completada:", e);
    }
    return serverError("Error al guardar el progreso");
  }
}
