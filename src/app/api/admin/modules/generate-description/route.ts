import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Generación con IA no configurada" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Eres un creador de contenido para un curso profesional de QA (Quality Assurance / testing). Respondes en español con tono formal y didáctico, sin coloquialismos y con términos técnicos precisos.\n\nLa descripción debe tener estructura en Markdown, sin usar ## (no uses encabezados de nivel 2). Usa **negritas** para las etiquetas y listas con guión (-).\n- **Objetivos** (o \"Qué aprenderás\"): lista con 2-4 ítems usando guiones (-).\n- **Contenido**: 1-2 frases que presenten el módulo/submódulo y su relevancia en QA.\n- Opcional: una frase de cierre.\n\nResponde únicamente con el Markdown de la descripción, sin JSON ni texto extra.",
        },
        {
          role: "user",
          content: `Genera la descripción para el siguiente módulo de un curso de QA: "${title.trim()}". Sigue la estructura indicada (Objetivos con lista, Contenido breve, cierre opcional).`,
        },
      ],
    });
    const description = completion.choices[0]?.message?.content?.trim();
    if (!description) {
      return NextResponse.json(
        { error: "No se pudo generar la descripción" },
        { status: 502 }
      );
    }
    return NextResponse.json({ description });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al generar descripción del módulo con IA:", e);
    }
    return NextResponse.json(
      { error: "Error al generar la descripción con IA" },
      { status: 500 }
    );
  }
}
