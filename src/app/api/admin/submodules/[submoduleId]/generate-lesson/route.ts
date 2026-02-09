import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";
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

type Params = { params: Promise<{ submoduleId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
      { status: 503 },
    );
  }

  const { submoduleId } = await params;
  if (!submoduleId) {
    return NextResponse.json(
      { error: "ID de submódulo requerido" },
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

    const submodule = await prisma.submodule.findUnique({
      where: { id: submoduleId },
      include: { module: { select: { title: true, description: true } } },
    });
    if (!submodule) {
      return NextResponse.json(
        { error: "Submódulo no encontrado" },
        { status: 404 },
      );
    }

    const existingLessons = await prisma.lesson.findMany({
      where: { submoduleId },
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
        moduleTitle: submodule.module.title,
        moduleDescription: submodule.module.description,
        submoduleTitle: submodule.title,
        submoduleDescription: submodule.description,
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
      { status: 500 },
    );
  }
}
