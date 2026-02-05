import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ lessonId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_CONTENT = 2000;
const MAX_PREV_TITLE = 80;

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY no configurada. Añádela en .env para usar las sugerencias.",
        suggestions: [],
      },
      { status: 503 }
    );
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido", suggestions: [] },
      { status: 400 }
    );
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { submodule: { select: { id: true } } },
    });
    if (!lesson) {
      return NextResponse.json(
        { error: "Lección no encontrada", suggestions: [] },
        { status: 404 }
      );
    }

    const previousLessons = await prisma.lesson.findMany({
      where: { submoduleId: lesson.submoduleId, order: { lt: lesson.order } },
      orderBy: { order: "asc" },
      select: { title: true, order: true },
    });
    const previousIndex = previousLessons
      .map((l, i) => `${i + 1}. ${l.title.slice(0, MAX_PREV_TITLE)}`)
      .join("\n");
    const contentSnippet =
      lesson.content.length > MAX_CONTENT
        ? lesson.content.slice(0, MAX_CONTENT) + "..."
        : lesson.content;

    const prompt = `Eres un experto en diseño de ejercicios para cursos de QA.
Índice del módulo (lecciones anteriores a la actual):
${previousIndex || "(ninguna)"}

Lección actual: "${lesson.title}"

Contenido de la lección:
${contentSnippet}

Sugiere entre 4 y 6 ideas de ejercicios (pueden ser de tipo test, verdadero/falso o código si el contenido es adecuado). Los ejercicios pueden requerir recordar conceptos de lecciones anteriores.
Responde ÚNICAMENTE con un JSON válido: { "suggestions": [ { "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "CODE", "description": "enunciado o idea breve del ejercicio" }, ... ] }.`;

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ suggestions: [] });
    }

    try {
      const parsed = JSON.parse(raw) as {
        suggestions?: Array<{ type?: string; description?: string }>;
      };
      const list = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter(
              (s) =>
                s && typeof s === "object" && typeof (s as { description?: unknown }).description === "string"
            )
            .map((s) => ({
              type:
                (s as { type?: string }).type === "CODE" ||
                (s as { type?: string }).type === "TRUE_FALSE"
                  ? (s as { type: string }).type
                  : "MULTIPLE_CHOICE",
              description: (s as { description: string }).description.trim(),
            }))
        : [];
      return NextResponse.json({ suggestions: list });
    } catch {
      return NextResponse.json({ suggestions: [] });
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al obtener sugerencias de ejercicios:", e);
    }
    return NextResponse.json(
      { error: "Error al obtener sugerencias", suggestions: [] },
      { status: 500 }
    );
  }
}
