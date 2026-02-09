import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/testimonials
 * Lista testimonios aprobados para la landing (público).
 */
export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(
      testimonials.map((t) => ({
        id: t.id,
        userName: t.user.name,
        roleOrTitle: t.roleOrTitle,
        text: t.text,
        createdAt: t.createdAt.toISOString(),
      })),
    );
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error listando testimonios:", e);
    }
    return NextResponse.json(
      { error: "Error al cargar testimonios" },
      { status: 500 },
    );
  }
}
