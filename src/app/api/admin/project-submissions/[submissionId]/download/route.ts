import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submissionId: string }> };

export async function GET(_request: Request, { params }: Params) {
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

    if (!submission || submission.submissionType !== "FILE" || !submission.filePath) {
      return NextResponse.json(
        { error: "Entrega no encontrada o no es un archivo" },
        { status: 404 }
      );
    }

    const fullPath = path.join(process.cwd(), submission.filePath);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: "El archivo ya no está disponible" },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(fullPath);
    const filename = path.basename(submission.filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al descargar archivo:", e);
    }
    return NextResponse.json(
      { error: "Error al descargar el archivo" },
      { status: 500 }
    );
  }
}
