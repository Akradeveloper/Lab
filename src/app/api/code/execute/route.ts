import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

const ALLOWED_LANGUAGES = ["javascript", "node", "typescript", "python", "java"] as const;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  try {
    const body = await request.json();
    const exerciseId = typeof body.exerciseId === "string" ? body.exerciseId : "";
    const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
    const code = typeof body.code === "string" ? body.code : "";
    const language = typeof body.language === "string" ? body.language : "javascript";

    if (!exerciseId || !lessonId) {
      return badRequest("exerciseId y lessonId son obligatorios");
    }
    if (!ALLOWED_LANGUAGES.includes(language as (typeof ALLOWED_LANGUAGES)[number])) {
      return badRequest(`Lenguaje no permitido. Use: ${ALLOWED_LANGUAGES.join(", ")}`);
    }

    const exercise = await prisma.exercise.findFirst({
      where: { id: exerciseId, lessonId },
    });
    if (!exercise) {
      return badRequest("Ejercicio no encontrado o no pertenece a la lección");
    }
    if (exercise.type !== "DESARROLLO") {
      return badRequest("Solo se puede ejecutar código en ejercicios de tipo DESARROLLO");
    }

    const job = await prisma.codeExecutionJob.create({
      data: {
        userId: session.user.id,
        exerciseId,
        lessonId,
        code,
        language,
        status: "PENDING",
      },
    });

    const pendingBefore = await prisma.codeExecutionJob.count({
      where: {
        status: "PENDING",
        createdAt: { lt: job.createdAt },
      },
    });
    const position = pendingBefore + 1;

    return NextResponse.json({ jobId: job.id, position });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al encolar ejecución:", e);
    }
    return serverError("Error al encolar la ejecución");
  }
}
