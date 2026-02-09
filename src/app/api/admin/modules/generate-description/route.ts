import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import {
  buildDescriptionSystemPrompt,
  buildModuleDescriptionUserPrompt,
} from "@/lib/ai-prompts";
import { getOpenAIModel } from "@/lib/app-config";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Generación con IA no configurada" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 },
      );
    }

    const model = await getOpenAIModel();
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildDescriptionSystemPrompt() },
        { role: "user", content: buildModuleDescriptionUserPrompt(title) },
      ],
    });
    const description = completion.choices[0]?.message?.content?.trim();
    if (!description) {
      return NextResponse.json(
        { error: "No se pudo generar la descripción" },
        { status: 502 },
      );
    }
    return NextResponse.json({ description });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al generar descripción del módulo con IA:", e);
    }
    return NextResponse.json(
      { error: "Error al generar la descripción con IA" },
      { status: 500 },
    );
  }
}
