import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";
import {
  buildLessonSystemPrompt,
  buildLessonUserPrompt,
  VALID_DIFFICULTY,
} from "@/lib/ai-prompts";
import {
  getOpenAIModel,
  getAppConfigNumber,
  DEFAULT_MAX_PREV_CONTENT_LENGTH,
} from "@/lib/app-config";
import type { DifficultyLevel } from "@prisma/client";

type Params = { params: Promise<{ moduleId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request, { params }: Params) {
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
    const body = await request.json();
    const topic =
      typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json(
        { error: "El tema o título de la lección es obligatorio" },
        { status: 400 },
      );
    }

    const difficultyValue =
      body?.difficulty != null &&
      typeof body.difficulty === "string" &&
      VALID_DIFFICULTY.includes(
        body.difficulty as (typeof VALID_DIFFICULTY)[number],
      )
        ? (body.difficulty as DifficultyLevel)
        : undefined;

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
            "Este módulo tiene submódulos; usa la generación desde un submódulo.",
        },
        { status: 400 },
      );
    }

    const existingLessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
      select: { title: true, order: true, content: true },
    });

    const [model, maxPrevContentLength] = await Promise.all([
      getOpenAIModel(),
      getAppConfigNumber(
        "max_prev_content_length",
        DEFAULT_MAX_PREV_CONTENT_LENGTH
      ),
    ]);
    const systemPrompt = buildLessonSystemPrompt();
    const userPrompt = buildLessonUserPrompt(
      {
        moduleTitle: module_.title,
        moduleDescription: module_.description,
        existingLessons,
        topic,
      },
      { maxPrevContentLength }
    );

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
        : topic;
    const content =
      typeof parsed.content === "string" ? parsed.content : "";

    const nextOrder = existingLessons.length;
    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
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
      { status: 500 },
    );
  }
}
