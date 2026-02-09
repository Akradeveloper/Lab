import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submissionId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { submissionId } = await params;
  if (!submissionId) {
    return NextResponse.json(
      { error: "ID de entrega requerido" },
      { status: 400 }
    );
  }

  try {
    const submission = await prisma.projectSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Entrega no encontrada" },
        { status: 404 }
      );
    }

    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "La entrega no está pendiente de revisión" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Error al rechazar la entrega" },
      { status: 500 }
    );
  }
}
