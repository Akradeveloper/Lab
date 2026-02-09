import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ submissionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const { submissionId } = await params;
  if (!submissionId) return badRequest("ID de entrega requerido");

  try {
    const submission = await prisma.projectSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.submissionType !== "FILE" || !submission.filePath) {
      return notFound("Entrega no encontrada o no es un archivo");
    }

    const fullPath = path.join(process.cwd(), submission.filePath);
    if (!fs.existsSync(fullPath)) {
      return notFound("El archivo ya no está disponible");
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
    return serverError("Error al descargar el archivo");
  }
}
