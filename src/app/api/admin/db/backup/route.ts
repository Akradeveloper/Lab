import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "fs";
import { authOptions } from "@/lib/auth";
import { getDbFilePathOrThrow } from "@/lib/db-path";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const dbPath = getDbFilePathOrThrow();
    const buffer = fs.readFileSync(dbPath);
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
