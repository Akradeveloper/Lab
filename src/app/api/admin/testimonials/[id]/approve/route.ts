import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-responses";
import { handlePrismaError } from "@/lib/prisma-error";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/testimonials/[id]/approve
 * Aprueba o rechaza un testimonio (solo ADMIN).
 * Body: { approved: boolean }
 */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("ID requerido");

  try {
    const body = await request.json();
    const approved = body.approved === true;

    await prisma.testimonial.update({
      where: { id },
      data: { approved },
    });

    return NextResponse.json({ ok: true, approved });
  } catch (e) {
    return handlePrismaError(e, { notFoundMessage: "Testimonio no encontrado", context: "Error aprobando testimonio:" });
  }
}
