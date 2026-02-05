import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submoduleId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

  const { submoduleId } = await params;
  if (!submoduleId) {
    return NextResponse.json(
      { error: "ID de submódulo requerido", suggestions: [] },
      { status: 400 }
    );
  }

  try {
    const submodule = await prisma.submodule.findUnique({
      where: { id: submoduleId },
      include: { module: { select: { title: true, description: true } } },
    });
    if (!submodule) {
      return NextResponse.json(
        { error: "Submódulo no encontrado", suggestions: [] },
        { status: 404 }
      );
    }

    const existingLessons = await prisma.lesson.findMany({
      where: { submoduleId },
      orderBy: { order: "asc" },
      select: { title: true, order: true },
    });

    const lessonsList = existingLessons
      .map((l, i) => `${i + 1}. ${l.title}`)
      .join("\n");

    const prompt = `Eres un experto en diseño de currículo para cursos de QA (Quality Assurance / testing).
Módulo: "${submodule.module.title}".
Submódulo: "${submodule.title}".
${submodule.description ? `Descripción del submódulo: ${submodule.description}\n` : ""}
${submodule.module.description ? `Descripción del módulo: ${submodule.module.description}\n` : ""}
Lecciones ya creadas en este submódulo (no repitas estos temas):
${lessonsList || "(ninguna todavía)"}

Sugiere entre 3 y 5 temas concretos para las siguientes lecciones, sin repetir los existentes, en orden de dificultad creciente.
Responde ÚNICAMENTE con un JSON válido: { "suggestions": [ "tema 1", "tema 2", ... ] }.`;

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
      const parsed = JSON.parse(raw) as { suggestions?: unknown[] };
      const list = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        : [];
      return NextResponse.json({ suggestions: list });
    } catch {
      return NextResponse.json({ suggestions: [] });
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al obtener sugerencias de lecciones:", e);
    }
    return NextResponse.json(
      { error: "Error al obtener sugerencias", suggestions: [] },
      { status: 500 }
    );
  }
}
