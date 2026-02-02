/**
 * Validación de variables de entorno necesarias para la app.
 * Al importar este módulo se comprueba que existan; si falta alguna, se lanza con mensaje claro.
 */

const required = ["NEXTAUTH_SECRET", "NEXTAUTH_URL", "DATABASE_URL"] as const;

function validateEnv(): {
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  DATABASE_URL: string;
} {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
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
