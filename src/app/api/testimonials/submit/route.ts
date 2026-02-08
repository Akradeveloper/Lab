import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_LESSONS = 5;
const MAX_TEXT_LENGTH = 500;
const MAX_ROLE_LENGTH = 200;

/**
 * POST /api/testimonials/submit
 * Crea un testimonio del usuario (pendiente de aprobación).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const roleOrTitle =
      typeof body.roleOrTitle === "string"
        ? body.roleOrTitle.trim().slice(0, MAX_ROLE_LENGTH)
        : null;

    if (!text || text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error:
            text.length > MAX_TEXT_LENGTH
              ? `El texto no puede superar ${MAX_TEXT_LENGTH} caracteres.`
              : "El texto del testimonio es obligatorio.",
        },
        { status: 400 },
      );
    }

    const progressCount = await prisma.progress.count({
      where: { userId: session.user.id },
    });
    if (progressCount < MIN_LESSONS) {
      return NextResponse.json(
        { error: "Necesitas completar al menos 5 lecciones para enviar un testimonio." },
        { status: 403 },
      );
    }

    const existing = await prisma.testimonial.findFirst({
      where: { userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya has enviado un testimonio." },
        { status: 409 },
      );
    }

    await prisma.testimonial.create({
      data: {
        userId: session.user.id,
        text,
        roleOrTitle: roleOrTitle || null,
        approved: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error creando testimonio:", e);
    }
    return NextResponse.json(
      { error: "Error al guardar el testimonio" },
      { status: 500 },
    );
  }
}
