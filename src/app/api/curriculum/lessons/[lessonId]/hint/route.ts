import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAIModel } from "@/lib/app-config";

type Params = { params: Promise<{ lessonId: string }> };

/**
 * POST /api/curriculum/lessons/[lessonId]/hint
 * Genera una pista para un ejercicio usando OpenAI.
 * Body: { exerciseId: string }
 */
export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { lessonId } = await params;

  try {
    const body = await request.json();
    const { exerciseId } = body as { exerciseId?: string };

    if (!exerciseId) {
      return NextResponse.json(
        { error: "Se requiere exerciseId" },
        { status: 400 },
      );
    }

    const exercise = await prisma.exercise.findFirst({
      where: { id: exerciseId, lessonId },
      select: {
        type: true,
        question: true,
        options: true,
        correctAnswer: true,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Ejercicio no encontrado" },
        { status: 404 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: generar pista genérica sin IA
      return NextResponse.json({
        hint: generarPistaLocal(exercise),
      });
    }

    // Generar con OpenAI
    const systemPrompt =
      "Eres un tutor de QA y testing. El alumno está atascado en un ejercicio. " +
      "Genera una pista breve (2-3 frases máximo) que le ayude a pensar en la respuesta correcta " +
      "SIN dar la respuesta directa. Responde en español.";

    let userPrompt = `Tipo de ejercicio: ${exercise.type}\nPregunta: ${exercise.question}\n`;
    if (exercise.type === "MULTIPLE_CHOICE") {
      try {
        const opts = JSON.parse(exercise.options) as string[];
        userPrompt += `Opciones: ${opts.join(", ")}\n`;
      } catch {
        // ignorar
      }
    }

    const model = await getOpenAIModel();
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        hint: generarPistaLocal(exercise),
      });
    }

    const data = await res.json();
    const hint =
      data?.choices?.[0]?.message?.content?.trim() ??
      generarPistaLocal(exercise);

    return NextResponse.json({ hint });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error generando pista:", e);
    }
    return NextResponse.json(
      { error: "Error al generar la pista" },
      { status: 500 },
    );
  }
}

/** Pista genérica cuando no hay API de IA disponible */
function generarPistaLocal(exercise: {
  type: string;
  question: string;
}): string {
  switch (exercise.type) {
    case "TRUE_FALSE":
      return "Piensa en la definición exacta del concepto. ¿Es siempre verdad o hay excepciones?";
    case "MULTIPLE_CHOICE":
      return "Descarta las opciones que claramente no encajan y reflexiona sobre las restantes.";
    case "CODE":
      return "Revisa la estructura del código y compara con los tests esperados. ¿Qué resultado debería devolver?";
    default:
      return "Relee la teoría de la lección y piensa en los conceptos clave antes de responder.";
  }
}
