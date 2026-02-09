import { NextResponse } from "next/server";
import fs from "fs";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-responses";
import { restoreFromJson } from "@/lib/db-backup-restore";
import { getDbFilePath } from "@/lib/db-path";
import { isMySQL } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";

const SQLITE_HEADER = "SQLite format 3\0";

function isSqliteFile(buffer: Buffer): boolean {
  return buffer.length >= 16 && buffer.subarray(0, 16).toString("utf8") === SQLITE_HEADER;
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("No se pudo leer el formulario");
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return badRequest("Selecciona un archivo válido (.db o .json)");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    if (isMySQL()) {
      const name = (file.name || "").toLowerCase();
      const first = buffer[0];
      const isJson =
        name.endsWith(".json") || (buffer.length > 0 && first === 0x7b);
      if (!isJson) {
        return badRequest("Con MySQL solo se pueden restaurar archivos de backup .json generados por esta aplicación.");
      }
      const text = buffer.toString("utf8");
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return badRequest("El archivo no es un JSON válido.");
      }
      await restoreFromJson(prisma, json);
      return NextResponse.json({
        success: true,
        message: "Base de datos restaurada correctamente",
      });
    }

    if (!isSqliteFile(buffer)) {
      return badRequest("El archivo no parece una base de datos SQLite válida");
    }
    const dbPath = getDbFilePath();
    await prisma.$disconnect();
    fs.writeFileSync(dbPath, buffer);
    return NextResponse.json({
      success: true,
      message: "Base de datos restaurada correctamente",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al restaurar la BD";
    return serverError(message);
  }
}
