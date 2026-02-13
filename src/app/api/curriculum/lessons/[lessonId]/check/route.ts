import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { lessonId } = await params;
  if (!lessonId) return badRequest("ID de lección requerido");

  try {
    const body = await request.json();
    const answers = body.answers as Record<string, unknown>;

    if (!answers || typeof answers !== "object") {
      return badRequest("Se espera un objeto answers con las respuestas por ejercicio");
    }

    const exercises = await prisma.exercise.findMany({
      where: { lessonId },
      orderBy: { order: "asc" },
    });

    const results: { exerciseId: string; correct: boolean }[] = [];
    let allCorrect = true;

    for (const ex of exercises) {
      if (ex.type === "DESARROLLO") {
        const payload = answers[ex.id];
        const isRunSuccess =
          payload != null &&
          typeof payload === "object" &&
          "__desarrolloRun" in payload &&
          (payload as { exitCode?: number }).exitCode === 0;
        results.push({ exerciseId: ex.id, correct: isRunSuccess });
        if (!isRunSuccess) allCorrect = false;
        continue;
      }

      if (ex.type === "CODE") {
        const userCode =
          typeof answers[ex.id] === "string"
            ? answers[ex.id]
            : answers[ex.id] != null
              ? String(answers[ex.id])
              : "";
        const solution = typeof ex.correctAnswer === "string" ? ex.correctAnswer : "";
        const correct =
          solution.trim() !== "" &&
          normalizeCode(String(userCode)) === normalizeCode(String(solution));
        results.push({ exerciseId: ex.id, correct });
        if (!correct) allCorrect = false;
        continue;
      }

      const userAnswer = answers[ex.id];
      const correct = isAnswerCorrect(ex, userAnswer);
      results.push({ exerciseId: ex.id, correct });
      if (!correct) allCorrect = false;
    }

    const userId = session.user.id;
    try {
      await prisma.lessonCheckAttempt.create({
        data: { userId, lessonId, allCorrect },
      });
      await prisma.exerciseAttempt.createMany({
        data: results.map((r) => ({
          userId,
          exerciseId: r.exerciseId,
          lessonId,
          correct: r.correct,
        })),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error al guardar intentos:", err);
      }
    }

    return NextResponse.json({
      allCorrect,
      results,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al comprobar respuestas:", e);
    }
    return serverError("Error al comprobar las respuestas");
  }
}

function normalizeCode(s: string): string {
  return String(s ?? "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .trim();
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
            ? Number.parseInt(userAnswer, 10)
            : Number.NaN;
      return Number.isInteger(idx) && idx === correct;
    }

    return false;
  } catch {
    return false;
  }
}
