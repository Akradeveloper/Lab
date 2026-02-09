import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/testimonials/[id]/approve
 * Aprueba o rechaza un testimonio (solo ADMIN).
 * Body: { approved: boolean }
 */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const approved = body.approved === true;

    await prisma.testimonial.update({
      where: { id },
      data: { approved },
    });

    return NextResponse.json({ ok: true, approved });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error aprobando testimonio:", e);
    }
    return NextResponse.json(
      { error: "Error al actualizar el testimonio" },
      { status: 500 },
    );
  }
}
