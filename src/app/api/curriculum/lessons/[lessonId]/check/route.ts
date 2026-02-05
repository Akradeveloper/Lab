import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, { params }: Params) {
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
    const body = await request.json();
    const answers = body.answers as Record<string, unknown>;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Se espera un objeto answers con las respuestas por ejercicio" },
        { status: 400 }
      );
    }

    const exercises = await prisma.exercise.findMany({
      where: { lessonId },
      orderBy: { order: "asc" },
    });

    const results: { exerciseId: string; correct: boolean }[] = [];
    let allCorrect = true;

    for (const ex of exercises) {
      if (ex.type === "CODE") continue;
      const userAnswer = answers[ex.id];
      const correct = isAnswerCorrect(ex, userAnswer);
      results.push({ exerciseId: ex.id, correct });
      if (!correct) allCorrect = false;
    }

    return NextResponse.json({
      allCorrect,
      results,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al comprobar respuestas:", e);
    }
    return NextResponse.json(
      { error: "Error al comprobar las respuestas" },
      { status: 500 }
    );
  }
}

function isAnswerCorrect(
  exercise: { type: string; correctAnswer: string },
  userAnswer: unknown
): boolean {
  try {
    const correct = JSON.parse(exercise.correctAnswer);

    if (exercise.type === "TRUE_FALSE") {
      const userBool =
        userAnswer === true || userAnswer === "true"
          ? true
          : userAnswer === false || userAnswer === "false"
            ? false
            : undefined;
      const correctBool =
        correct === true || correct === "true"
          ? true
          : correct === false || correct === "false"
            ? false
            : undefined;
      return typeof userBool === "boolean" && correctBool !== undefined && userBool === correctBool;
    }

    if (exercise.type === "MULTIPLE_CHOICE") {
      const idx =
        typeof userAnswer === "number"
          ? userAnswer
          : typeof userAnswer === "string"
            ? parseInt(userAnswer, 10)
            : NaN;
      return Number.isInteger(idx) && idx === correct;
    }

    return false;
  } catch {
    return false;
  }
}
