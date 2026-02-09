import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/certificates/[id]
 * Devuelve los datos de un certificado (público, verificable).
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID de certificado requerido" },
      { status: 400 },
    );
  }

  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        module: { select: { title: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: certificate.id,
      userName: certificate.user.name,
      moduleTitle: certificate.module.title,
      issuedAt: certificate.issuedAt.toISOString(),
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al obtener certificado:", e);
    }
    return NextResponse.json(
      { error: "Error al obtener el certificado" },
      { status: 500 },
    );
  }
}
