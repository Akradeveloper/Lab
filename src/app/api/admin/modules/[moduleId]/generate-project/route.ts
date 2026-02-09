import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";
import {
  buildProjectSystemPrompt,
  buildProjectUserPrompt,
} from "@/lib/ai-prompts";
import { getOpenAIModel } from "@/lib/app-config";

type Params = { params: Promise<{ moduleId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/** Presupuesto total de caracteres para el contenido de lecciones enviado a la IA. */
const MAX_PROJECT_CONTEXT_CHARS = 50_000;

export async function POST(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY no configurada. Añádela en .env para usar la generación con IA.",
      },
      { status: 503 },
    );
  }

  const { moduleId } = await params;
  if (!moduleId) {
    return NextResponse.json(
      { error: "ID de módulo requerido" },
      { status: 400 },
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
        { status: 404 },
      );
    }
    if (module_._count.submodules > 0) {
      return NextResponse.json(
        {
          error:
            "Este módulo tiene submódulos; usa la generación de proyecto desde un submódulo.",
        },
        { status: 400 },
      );
    }

    const previousLessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
      select: { title: true, order: true, content: true },
    });

    if (previousLessons.length === 0) {
      return NextResponse.json(
        {
          error:
            "No hay lecciones anteriores. Añade al menos una lección antes de generar un proyecto.",
        },
        { status: 400 },
      );
    }

    const budgetPerLesson = Math.floor(
      MAX_PROJECT_CONTEXT_CHARS / previousLessons.length,
    );
    const previousLessonsTruncated = previousLessons.map((l) => ({
      title: l.title,
      order: l.order,
      content:
        l.content.length > budgetPerLesson
          ? l.content.slice(0, budgetPerLesson) + "..."
          : l.content,
    }));

    const systemPrompt = buildProjectSystemPrompt();
    const userPrompt = buildProjectUserPrompt({
      moduleTitle: module_.title,
      moduleDescription: module_.description,
      previousLessons: previousLessonsTruncated,
    });

    const model = await getOpenAIModel();
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model,
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
        { status: 502 },
      );
    }

    let parsed: { title?: string; content?: string };
    try {
      parsed = JSON.parse(raw) as { title?: string; content?: string };
    } catch {
      return NextResponse.json(
        { error: "Respuesta de la IA no es JSON válido" },
        { status: 502 },
      );
    }

    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : "Proyecto de fin de módulo";
    const content = typeof parsed.content === "string" ? parsed.content : "";

    return NextResponse.json({ title, content });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al generar proyecto con IA:", e);
    }
    return NextResponse.json(
      {
        error:
          (e as Error).message?.includes("API key")
            ? "Error de configuración con OpenAI. Revisa OPENAI_API_KEY."
            : "Error al generar el proyecto con IA.",
      },
      { status: 500 },
    );
  }
}
