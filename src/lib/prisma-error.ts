import { NextResponse } from "next/server";
import { notFound, serverError } from "@/lib/api-responses";

/**
 * Maneja errores de Prisma en rutas API: P2025 (registro no encontrado) → 404,
 * resto → 500. Opcionalmente registra en consola en desarrollo.
 */
export function handlePrismaError(
  e: unknown,
  options: { notFoundMessage: string; context?: string }
): NextResponse {
  if ((e as { code?: string })?.code === "P2025") {
    return notFound(options.notFoundMessage);
  }
  if (process.env.NODE_ENV !== "production" && options.context) {
    console.error(options.context, e);
  }
  return serverError();
}
