import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { DifficultyLevel } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submoduleId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_PREV_CONTENT_LENGTH = 280;
const VALID_DIFFICULTY = ["APRENDIZ", "JUNIOR", "MID", "SENIOR", "ESPECIALISTA"] as const;

function difficultyPromptFragment(difficulty: string): string {
  const desc: Record<string, string> = {
    APRENDIZ: "introductorio: sin asumir experiencia previa, conceptos muy básicos.",
    JUNIOR: "nivel junior: conceptos básicos aplicados, ejemplos sencillos.",
    MID: "nivel intermedio: asume conocimientos previos, mayor profundidad.",
    SENIOR: "nivel senior: contenido avanzado, mejores prácticas y casos reales.",
    ESPECIALISTA: "nivel especialista: experto, temas complejos y optimización.",
  };
  return `Nivel de la lección: ${difficulty}. ${desc[difficulty] ?? "Adapta el contenido a este nivel."} El contenido debe ajustarse a esta profundidad.`;
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY no configurada. Añádela en .env para usar la generación con IA.",
      },
      { status: 503 }
    );
  }

  const { submoduleId } = await params;
  if (!submoduleId) {
    return NextResponse.json(
      { error: "ID de submódulo requerido" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const topic =
      typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json(
        { error: "El tema o título de la lección es obligatorio" },
        { status: 400 }
      );
    }
    const difficultyValue =
      body?.difficulty != null &&
      typeof body.difficulty === "string" &&
      VALID_DIFFICULTY.includes(body.difficulty as (typeof VALID_DIFFICULTY)[number])
        ? (body.difficulty as DifficultyLevel)
        : undefined;

    const VALID_LANGUAGES = ["python", "javascript", "java", "typescript"] as const;
    const language =
      typeof body?.language === "string" && VALID_LANGUAGES.includes(body.language as (typeof VALID_LANGUAGES)[number])
        ? body.language
        : undefined;

    const submodule = await prisma.submodule.findUnique({
      where: { id: submoduleId },
      include: { module: { select: { title: true, description: true } } },
    });
    if (!submodule) {
      return NextResponse.json(
        { error: "Submódulo no encontrado" },
        { status: 404 }
      );
    }

    const existingLessons = await prisma.lesson.findMany({
      where: { submoduleId },
      orderBy: { order: "asc" },
      select: { title: true, order: true, content: true },
    });

    const previousContext = existingLessons
      .map((l, i) => {
        const summary =
          l.content.length > MAX_PREV_CONTENT_LENGTH
            ? l.content.slice(0, MAX_PREV_CONTENT_LENGTH) + "..."
            : l.content;
        return `Lección ${i + 1} (orden ${l.order}): "${l.title}". Contenido: ${summary}`;
      })
      .join("\n\n");

    const systemPrompt = `Eres un creador de contenido para un curso profesional de QA (Quality Assurance / testing).
Genera lecciones en español con tono formal y didáctico, sin coloquialismos. Usa términos técnicos con precisión.

Estructura obligatoria del contenido en Markdown:
1) **Objetivos de aprendizaje**: lista breve (3-5 ítems) al inicio con lo que el alumno logrará.
2) **Desarrollo**: secciones con ## (por ejemplo "Conceptos clave", "Teoría", "Ejemplos"). Párrafos cortos, listas cuando ayude. Si el tema es orientado a código (tests, automatización, scripts), incluye bloques de código con \`\`\` y explicación paso a paso.
3) **Resumen o Puntos clave**: cierre breve al final.

Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra:
{"title": "Título de la lección", "content": "Contenido en Markdown siguiendo la estructura anterior"}`;

    const difficultyInstruction = difficultyValue
      ? difficultyPromptFragment(difficultyValue) + "\n\n"
      : "";

    const languageInstruction = language
      ? `Todos los ejemplos de código y la teoría deben usar únicamente el lenguaje ${language}. Los bloques de código en el contenido deben estar en ${language}. Mantén el resto del texto en español.\n\n`
      : "";

    const userPrompt = `${difficultyInstruction}${languageInstruction}Módulo: "${submodule.module.title}".
Submódulo: "${submodule.title}".
${submodule.description ? `Descripción del submódulo: ${submodule.description}\n` : ""}
${submodule.module.description ? `Descripción del módulo: ${submodule.module.description}\n` : ""}
${
  previousContext
    ? `Lecciones ya existentes en este submódulo (para que la nueva sea un poco más avanzada):\n${previousContext}\n\n`
    : "Es la primera lección del submódulo.\n\n"
}Genera la siguiente lección sobre este tema: "${topic}".
El contenido debe ser un poco más avanzado que las lecciones anteriores si las hay.
Si el tema es orientado a código (p. ej. Jest, Selenium, scripts, APIs), la sección de ejemplos debe incluir código real en bloques \`\`\` y explicación paso a paso.`;

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "La IA no devolvió contenido" },
        { status: 502 }
      );
    }

    let parsed: { title?: string; content?: string };
    try {
      parsed = JSON.parse(raw) as { title?: string; content?: string };
    } catch {
      return NextResponse.json(
        { error: "Respuesta de la IA no es JSON válido" },
        { status: 502 }
      );
    }

    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : topic;
    const content =
      typeof parsed.content === "string" ? parsed.content : "";

    const nextOrder = existingLessons.length;
    const lesson = await prisma.lesson.create({
      data: {
        submoduleId,
        title,
        content,
        order: nextOrder,
        ...(difficultyValue && { difficulty: difficultyValue }),
      },
    });

    return NextResponse.json(lesson);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al generar lección con IA:", e);
    }
    return NextResponse.json(
      {
        error:
          (e as Error).message?.includes("API key")
            ? "Error de configuración con OpenAI. Revisa OPENAI_API_KEY."
            : "Error al generar la lección con IA.",
      },
      { status: 500 }
    );
  }
}
