import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAppConfigNumber,
  DEFAULT_MIN_LESSONS_TESTIMONIAL,
  DEFAULT_TESTIMONIAL_MAX_TEXT,
  DEFAULT_TESTIMONIAL_MAX_ROLE_LENGTH,
} from "@/lib/app-config";

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
    const [maxTextLength, maxRoleLength, minLessons] = await Promise.all([
      getAppConfigNumber("testimonial_max_text", DEFAULT_TESTIMONIAL_MAX_TEXT),
      getAppConfigNumber(
        "testimonial_max_role_length",
        DEFAULT_TESTIMONIAL_MAX_ROLE_LENGTH
      ),
      getAppConfigNumber(
        "min_lessons_testimonial",
        DEFAULT_MIN_LESSONS_TESTIMONIAL
      ),
    ]);

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const roleOrTitle =
      typeof body.roleOrTitle === "string"
        ? body.roleOrTitle.trim().slice(0, maxRoleLength)
        : null;

    if (!text || text.length > maxTextLength) {
      return NextResponse.json(
        {
          error:
            text.length > maxTextLength
              ? `El texto no puede superar ${maxTextLength} caracteres.`
              : "El texto del testimonio es obligatorio.",
        },
        { status: 400 },
      );
    }

    const progressCount = await prisma.progress.count({
      where: { userId: session.user.id },
    });
    if (progressCount < minLessons) {
      return NextResponse.json(
        {
          error: `Necesitas completar al menos ${minLessons} lecciones para enviar un testimonio.`,
        },
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
