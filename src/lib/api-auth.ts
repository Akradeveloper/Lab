import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Obtiene la sesión del servidor solo si el usuario es ADMIN.
 * Usado en rutas API bajo /api/admin/ para evitar duplicar la comprobación.
 * @returns La sesión si es admin, o null si no hay sesión o no es admin.
 */
export async function getAdminSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return null;
  }
  return session;
}
