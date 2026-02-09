import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-responses";
import { handlePrismaError } from "@/lib/prisma-error";
import { prisma } from "@/lib/prisma";
import { getOpenAIModel } from "@/lib/app-config";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const modules = await prisma.module.findMany({
    orderBy: { order: "asc" },
    include: {
      submodules: {
        include: { _count: { select: { lessons: true } } },
      },
      _count: { select: { lessons: true } },
    },
  });

  const list = modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    order: m.order,
    lessonsCount:
      m.submodules.reduce((sum, sm) => sum + sm._count.lessons, 0) +
      m._count.lessons,
    createdAt: m.createdAt,
  }));

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  try {
    const body = await request.json();
    const { title, description, order } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return badRequest("El título es obligatorio");
    }

    const userDescription =
      description != null && typeof description === "string"
        ? description.trim()
        : "";
    let finalDescription: string | null =
      userDescription.length > 0 ? userDescription : null;

    if (finalDescription === null && OPENAI_API_KEY?.trim()) {
      try {
        const model = await getOpenAIModel();
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model,
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
        const content = completion.choices[0]?.message?.content?.trim();
        if (content) finalDescription = content;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Error al generar descripción del módulo con IA:", e);
        }
      }
    }

    const module_ = await prisma.module.create({
      data: {
        title: title.trim(),
        description: finalDescription,
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
      },
    });

    return NextResponse.json(module_);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al crear módulo:", e);
    }
    return serverError("Error al crear el módulo");
  }
}
