/**
 * Devuelve la URL de conexión a MySQL.
 * Usa DATABASE_URL si está definida; si no, la construye desde DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT y DB_USER.
 * No importar env.ts aquí para evitar ciclos.
 */
export function getDatabaseUrl(): string {
  const existing = process.env.DATABASE_URL?.trim();
  if (existing) return existing;

  const DB_HOST = process.env.DB_HOST?.trim();
  const DB_NAME = process.env.DB_NAME?.trim();
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_PORT = process.env.DB_PORT?.trim();
  const DB_USER = process.env.DB_USER?.trim();

  const missing = [
    !DB_HOST && "DB_HOST",
    !DB_NAME && "DB_NAME",
    DB_PASSWORD === undefined && "DB_PASSWORD",
    !DB_PORT && "DB_PORT",
    !DB_USER && "DB_USER",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de BD: ${missing.join(", ")}. Define DATABASE_URL o las cinco variables DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER.`
    );
  }

  const ssl = process.env.DB_SSL !== "false";
  const url = `mysql://${encodeURIComponent(DB_USER!)}:${encodeURIComponent(DB_PASSWORD!)}@${DB_HOST}:${DB_PORT}/${DB_NAME}${ssl ? "?ssl=true" : ""}`;
  return url;
}
