import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "fs";
import { authOptions } from "@/lib/auth";
import { getDbFilePath } from "@/lib/db-path";
import { prisma } from "@/lib/prisma";

const SQLITE_HEADER = "SQLite format 3\0";

function isSqliteFile(buffer: Buffer): boolean {
  return buffer.length >= 16 && buffer.subarray(0, 16).toString("utf8") === SQLITE_HEADER;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el formulario" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Selecciona un archivo .db válido" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!isSqliteFile(buffer)) {
    return NextResponse.json(
      { error: "El archivo no parece una base de datos SQLite válida" },
      { status: 400 }
    );
  }

  try {
    const dbPath = getDbFilePath();
    await prisma.$disconnect();
    fs.writeFileSync(dbPath, buffer);
    return NextResponse.json({
      success: true,
      message: "Base de datos restaurada correctamente",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al escribir la BD";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
