import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildDescriptionSystemPrompt,
  buildSubmoduleDescriptionUserPrompt,
} from "@/lib/ai-prompts";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

type Params = { params: Promise<{ moduleId: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Generación con IA no configurada" },
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

  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
  });
  if (!module_) {
    return NextResponse.json(
      { error: "Módulo no encontrado" },
      { status: 404 },
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

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: buildDescriptionSystemPrompt() },
        {
          role: "user",
          content: buildSubmoduleDescriptionUserPrompt(
            module_.title,
            title,
          ),
        },
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
      console.error(
        "Error al generar descripción del submódulo con IA:",
        e,
      );
    }
    return NextResponse.json(
      { error: "Error al generar la descripción con IA" },
      { status: 500 },
    );
  }
}
