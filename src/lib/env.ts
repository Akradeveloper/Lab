/**
 * Validación de variables de entorno necesarias para la app.
 * Al importar este módulo se comprueba que existan; si falta alguna, se lanza con mensaje claro.
 * Durante la fase de build de Next.js se permiten valores dummy para que el build complete (p. ej. en Vercel).
 */

import { PHASE_PRODUCTION_BUILD } from "next/constants";

const required = ["NEXTAUTH_SECRET", "NEXTAUTH_URL", "DATABASE_URL"] as const;

function validateEnv(): {
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  DATABASE_URL: string;
} {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
      return {
        NEXTAUTH_SECRET: "build",
        NEXTAUTH_URL: "http://localhost:3000",
        DATABASE_URL: "file:./prisma/dev.db",
      };
    }
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(", ")}. Asegúrate de configurar .env (ver README).`
    );
  }
  return {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    DATABASE_URL: process.env.DATABASE_URL!,
  };
}

export const env = validateEnv();
