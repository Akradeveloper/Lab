import { NextResponse } from "next/server";

/**
 * Respuestas HTTP estándar para rutas API. Centraliza mensajes y reduce duplicación.
 */

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message?: string): NextResponse {
  return NextResponse.json(
    { error: message ?? "Error interno del servidor" },
    { status: 500 }
  );
}
