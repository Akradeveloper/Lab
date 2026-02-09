import { NextResponse } from "next/server";
import fs from "fs";
import { getAdminSession } from "@/lib/api-auth";
import { serverError, unauthorized } from "@/lib/api-responses";
import { exportBackupToJson } from "@/lib/db-backup-restore";
import { getDbFilePathOrThrow } from "@/lib/db-path";
import { isMySQL } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

  try {
    if (isMySQL()) {
      const backup = await exportBackupToJson(prisma);
      const body = JSON.stringify(backup, null, 2);
      const filename = `backup-${timestamp}.json`;
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const dbPath = getDbFilePathOrThrow();
    const buffer = fs.readFileSync(dbPath);
    const filename = `backup-${timestamp}.db`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al leer la BD";
    return serverError(message);
  }
}
