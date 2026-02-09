import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submissionId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { submissionId } = await params;
  if (!submissionId) return badRequest("ID de entrega requerido");

  try {
    const submission = await prisma.projectSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) return notFound("Entrega no encontrada");

    if (submission.status !== "PENDING") {
      return badRequest("La entrega no está pendiente de revisión");
    }

    await prisma.projectSubmission.update({
      where: { id: submissionId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al rechazar entrega:", e);
    }
    return serverError("Error al rechazar la entrega");
  }
}
