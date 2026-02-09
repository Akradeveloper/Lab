import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";
import { buildSuggestLessonsPrompt } from "@/lib/ai-prompts";
import { getOpenAIModel } from "@/lib/app-config";

type Params = { params: Promise<{ moduleId: string }> };

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

  const { moduleId } = await params;
  if (!moduleId) return NextResponse.json({ error: "ID de módulo requerido", suggestions: [] }, { status: 400 });

  try {
    const module_ = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { _count: { select: { submodules: true } } },
    });
    if (!module_) return NextResponse.json({ error: "Módulo no encontrado", suggestions: [] }, { status: 404 });
    if (module_._count.submodules > 0) {
      return NextResponse.json(
        { error: "Este módulo tiene submódulos; usa las sugerencias desde un submódulo.", suggestions: [] },
        { status: 400 },
      );
    }

    const existingLessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
      select: { title: true, order: true },
    });

    const prompt = buildSuggestLessonsPrompt({
      moduleTitle: module_.title,
      moduleDescription: module_.description,
      existingLessons,
    });

    const model = await getOpenAIModel();
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
      const parsed = JSON.parse(raw) as { suggestions?: unknown[] };
      const list = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0,
          )
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
      { status: 500 },
    );
  }
}
