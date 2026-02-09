import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/testimonials
 * Lista todos los testimonios (solo ADMIN).
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorized();

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
    return serverError("Error al cargar testimonios");
  }
}
