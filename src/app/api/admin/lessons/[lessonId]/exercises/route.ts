import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido" },
      { status: 400 }
    );
  }

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
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
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
    const { type, question, options, correctAnswer, order } = body;

    if (!type || !["MULTIPLE_CHOICE", "TRUE_FALSE", "CODE"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo de ejercicio inválido (MULTIPLE_CHOICE, TRUE_FALSE o CODE)" },
        { status: 400 }
      );
    }
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "El enunciado es obligatorio" },
        { status: 400 }
      );
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
        type: type as "MULTIPLE_CHOICE" | "TRUE_FALSE" | "CODE",
        question: question.trim(),
        options: optionsStr,
        correctAnswer: correctStr,
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
      },
    });

    return NextResponse.json(exercise);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2003") {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al crear ejercicio:", e);
    }
    return NextResponse.json(
      { error: "Error al crear el ejercicio" },
      { status: 500 }
    );
  }
}
