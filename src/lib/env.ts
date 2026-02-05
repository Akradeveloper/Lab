/**
 * Validación de variables de entorno necesarias para la app.
 * Al importar este módulo se comprueba que existan; si falta alguna, se lanza con mensaje claro.
 * Durante la fase de build de Next.js se permiten valores dummy para que el build complete (p. ej. en Vercel).
 */

import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { getDatabaseUrl } from "@/lib/database-url";

const requiredAuth = ["NEXTAUTH_SECRET", "NEXTAUTH_URL"] as const;
const dbVars = ["DB_HOST", "DB_NAME", "DB_PASSWORD", "DB_PORT", "DB_USER"] as const;

function hasDatabaseConfig(): boolean {
  if (process.env.DATABASE_URL?.trim()) return true;
  return dbVars.every(
    (k) => (k === "DB_PASSWORD" ? process.env[k] !== undefined : process.env[k]?.trim())
  );
}

function validateEnv(): {
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  DATABASE_URL: string;
} {
  const missingAuth = requiredAuth.filter((key) => !process.env[key]?.trim());
  const hasDb = hasDatabaseConfig();

  if (missingAuth.length > 0 || !hasDb) {
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
      return {
        NEXTAUTH_SECRET: "build",
        NEXTAUTH_URL: "http://localhost:3000",
        DATABASE_URL: "file:./prisma/dev.db",
      };
    }
    const missing = [...missingAuth, ...(hasDb ? [] : ["DATABASE_URL o (DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER)"])];
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(", ")}. Asegúrate de configurar .env (ver README).`
    );
  }
  return {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    DATABASE_URL: getDatabaseUrl(),
  };
}

export const env = validateEnv();
