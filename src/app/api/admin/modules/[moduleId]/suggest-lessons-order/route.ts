import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ moduleId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CONTENT_MAX_LEN = 500;

export async function POST(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY no configurada. Añádela en .env para usar el orden con IA.",
      },
      { status: 503 }
    );
  }

  const { moduleId } = await params;
  if (!moduleId) {
    return NextResponse.json(
      { error: "ID de módulo requerido" },
      { status: 400 }
    );
  }

  try {
    const module_ = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { _count: { select: { submodules: true } } },
    });
    if (!module_) {
      return NextResponse.json(
        { error: "Módulo no encontrado" },
        { status: 404 }
      );
    }
    if (module_._count.submodules > 0) {
      return NextResponse.json(
        {
          error:
            "Este módulo tiene submódulos; usa Ordenar con IA desde un submódulo.",
        },
        { status: 400 }
      );
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
      select: { id: true, title: true, content: true, difficulty: true },
    });

    if (lessons.length <= 1) {
      return NextResponse.json({
        orderedIds: lessons.map((l) => l.id),
      });
    }

    const lessonsForPrompt = lessons.map((l) => ({
      id: l.id,
      title: l.title,
      contentSnippet:
        (l.content ?? "").slice(0, CONTENT_MAX_LEN) +
        ((l.content ?? "").length > CONTENT_MAX_LEN ? "…" : ""),
      difficulty: l.difficulty ?? "no asignado",
    }));

    const prompt = `Eres un experto en diseño de currículo para cursos de QA (Quality Assurance / testing).
Debes ordenar las siguientes lecciones de MÁS BÁSICO a MÁS COMPLEJO, para que un alumno las siga en ese orden.

Módulo: "${module_.title}".
${module_.description ? `Descripción: ${module_.description}\n` : ""}

Lecciones (cada una tiene id, título, un fragmento del contenido y nivel de dificultad si está asignado):
${lessonsForPrompt
  .map(
    (l) =>
      `- id: "${l.id}" | título: "${l.title}" | dificultad: ${l.difficulty} | contenido: ${l.contentSnippet || "(vacío)"}`
  )
  .join("\n")}

Responde ÚNICAMENTE con un JSON válido: { "orderedIds": [ "id1", "id2", ... ] }
El array orderedIds debe contener exactamente los mismos ${lessons.length} IDs que aparecen arriba, en el orden recomendado (más básico primero, más complejo al final).`;

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "La IA no devolvió un orden" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw) as { orderedIds?: unknown[] };
    const orderedIds = Array.isArray(parsed.orderedIds)
      ? parsed.orderedIds.filter((x): x is string => typeof x === "string")
      : [];

    const validIds = new Set(lessons.map((l) => l.id));
    if (orderedIds.length !== validIds.size || orderedIds.some((id) => !validIds.has(id))) {
      return NextResponse.json(
        { error: "El orden devuelto por la IA no es válido; intenta de nuevo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ orderedIds });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al sugerir orden de lecciones:", e);
    }
    return NextResponse.json(
      { error: "Error al obtener el orden sugerido" },
      { status: 500 }
    );
  }
}
