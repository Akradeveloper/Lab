import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { unauthorized } from "@/lib/api-responses";
import { isMySQL } from "@/lib/database-url";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorized();
  return NextResponse.json({
    database: isMySQL() ? "mysql" as const : "sqlite" as const,
  });
}
