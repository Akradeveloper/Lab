import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";
import { getOpenAIModel } from "@/lib/app-config";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type Params = { params: Promise<{ moduleId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { moduleId } = await params;
  if (!moduleId) return badRequest("ID de módulo requerido");

  const submodules = await prisma.submodule.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { lessons: true } },
    },
  });

  const list = submodules.map((s) => ({
    id: s.id,
    moduleId: s.moduleId,
    title: s.title,
    description: s.description,
    order: s.order,
    lessonsCount: s._count.lessons,
    createdAt: s.createdAt,
  }));

  return NextResponse.json(list);
}

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { moduleId } = await params;
  if (!moduleId) return badRequest("ID de módulo requerido");

  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { _count: { select: { lessons: true } } },
  });
  if (!module_) return notFound("Módulo no encontrado");
  if (module_._count.lessons > 0) {
    return badRequest("Este módulo tiene lecciones directas. No se pueden añadir submódulos; elimina antes las lecciones o usa solo submódulos.");
  }

  try {
    const body = await request.json();
    const { title, description, order } = body;

    if (!title || typeof title !== "string" || !title.trim()) return badRequest("El título es obligatorio");

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
              content: `Genera la descripción para el siguiente submódulo de un curso de QA. Módulo: "${module_.title}". Submódulo: "${title.trim()}". Sigue la estructura indicada (Objetivos con lista, Contenido breve, cierre opcional).`,
            },
          ],
        });
        const content = completion.choices[0]?.message?.content?.trim();
        if (content) finalDescription = content;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Error al generar descripción del submódulo con IA:", e);
        }
      }
    }

    const submodule = await prisma.submodule.create({
      data: {
        moduleId,
        title: title.trim(),
        description: finalDescription,
        order:
          typeof order === "number" && Number.isInteger(order) ? order : 0,
      },
    });

    return NextResponse.json(submodule);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2003") return notFound("Módulo no encontrado");
    if (process.env.NODE_ENV !== "production") console.error("Error al crear submódulo:", e);
    return serverError("Error al crear el submódulo");
  }
}
