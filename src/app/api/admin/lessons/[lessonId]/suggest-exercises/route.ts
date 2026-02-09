import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";
import { buildSuggestExercisesPrompt } from "@/lib/ai-prompts";
import {
  getOpenAIModel,
  getAppConfigNumber,
  DEFAULT_MAX_PREV_TITLE_LENGTH,
  DEFAULT_MAX_SUGGEST_CONTENT_LENGTH,
} from "@/lib/app-config";

type Params = { params: Promise<{ lessonId: string }> };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY no configurada. Añádela en .env para usar las sugerencias.",
        suggestions: [],
      },
      { status: 503 },
    );
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido", suggestions: [] },
      { status: 400 },
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
        { status: 404 },
      );
    }

    const previousLessons = await prisma.lesson.findMany({
      where: {
        submoduleId: lesson.submoduleId,
        order: { lt: lesson.order },
      },
      orderBy: { order: "asc" },
      select: { title: true, order: true },
    });

    const [model, maxPrevTitleLength, maxSuggestContentLength] =
      await Promise.all([
        getOpenAIModel(),
        getAppConfigNumber(
          "max_prev_title_length",
          DEFAULT_MAX_PREV_TITLE_LENGTH
        ),
        getAppConfigNumber(
          "max_suggest_content_length",
          DEFAULT_MAX_SUGGEST_CONTENT_LENGTH
        ),
      ]);
    const prompt = buildSuggestExercisesPrompt(
      {
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
        previousLessons,
      },
      { maxPrevTitleLength, maxSuggestContentLength }
    );

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model,
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
                s &&
                typeof s === "object" &&
                typeof (s as { description?: unknown }).description ===
                  "string",
            )
            .map((s) => ({
              type:
                (s as { type?: string }).type === "CODE" ||
                (s as { type?: string }).type === "TRUE_FALSE"
                  ? (s as { type: string }).type
                  : "MULTIPLE_CHOICE",
              description: (
                s as { description: string }
              ).description.trim(),
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
      { status: 500 },
    );
  }
}
