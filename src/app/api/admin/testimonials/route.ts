import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/testimonials
 * Lista todos los testimonios (solo ADMIN).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      testimonials.map((t) => ({
        id: t.id,
        text: t.text,
        roleOrTitle: t.roleOrTitle,
        approved: t.approved,
        createdAt: t.createdAt.toISOString(),
        user: t.user,
      })),
    );
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error listando testimonios admin:", e);
    }
    return NextResponse.json(
      { error: "Error al cargar testimonios" },
      { status: 500 },
    );
  }
}
