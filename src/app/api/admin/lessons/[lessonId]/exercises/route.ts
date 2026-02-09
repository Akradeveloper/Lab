import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { lessonId } = await params;
  if (!lessonId) return badRequest("ID de lección requerido");

  const exercises = await prisma.exercise.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  });

  const list = exercises.map((e) => ({
    id: e.id,
    lessonId: e.lessonId,
    type: e.type,
    question: e.question,
    options: e.options,
    correctAnswer: e.correctAnswer,
    order: e.order,
    createdAt: e.createdAt,
  }));

  return NextResponse.json(list);
}

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { lessonId } = await params;
  if (!lessonId) return badRequest("ID de lección requerido");

  try {
    const body = await request.json();
    const { type, question, options, correctAnswer, order } = body;

    if (!type || !["MULTIPLE_CHOICE", "TRUE_FALSE", "CODE", "DESARROLLO"].includes(type)) {
      return badRequest("Tipo de ejercicio inválido (MULTIPLE_CHOICE, TRUE_FALSE, CODE o DESARROLLO)");
    }
    if (!question || typeof question !== "string" || !question.trim()) {
      return badRequest("El enunciado es obligatorio");
    }

    let optionsStr: string;
    let correctStr: string;
    if (type === "CODE") {
      const codeOpts = options != null && typeof options === "object" && !Array.isArray(options)
        ? options as { language?: string; template?: string; testCases?: Array<{ input: string; expectedOutput: string }> }
        : {};
      optionsStr = JSON.stringify({
        language: typeof codeOpts.language === "string" ? codeOpts.language : "javascript",
        template: typeof codeOpts.template === "string" ? codeOpts.template : "",
        testCases: Array.isArray(codeOpts.testCases) ? codeOpts.testCases : [],
      });
      correctStr =
        typeof correctAnswer === "string" ? correctAnswer : "";
    } else if (type === "DESARROLLO") {
      optionsStr = "{}";
      correctStr = "";
    } else {
      optionsStr =
        Array.isArray(options) && options.length > 0
          ? JSON.stringify(options)
          : type === "TRUE_FALSE"
            ? JSON.stringify(["Verdadero", "Falso"])
            : "[]";
      correctStr =
        type === "TRUE_FALSE"
          ? typeof correctAnswer === "boolean"
            ? JSON.stringify(correctAnswer)
            : correctAnswer === "true" || correctAnswer === true
              ? JSON.stringify(true)
              : JSON.stringify(false)
          : typeof correctAnswer === "number" && Number.isInteger(correctAnswer)
            ? JSON.stringify(correctAnswer)
            : JSON.stringify(0);
    }

    const exercise = await prisma.exercise.create({
      data: {
        lessonId,
        type: type as "MULTIPLE_CHOICE" | "TRUE_FALSE" | "CODE" | "DESARROLLO",
        question: question.trim(),
        options: optionsStr,
        correctAnswer: correctStr,
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
      },
    });

    return NextResponse.json(exercise);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2003") return notFound("Lección no encontrada");
    if (process.env.NODE_ENV !== "production") console.error("Error al crear ejercicio:", e);
    return serverError("Error al crear el ejercicio");
  }
}
