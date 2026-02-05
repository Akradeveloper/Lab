import fs from "fs";
import path from "path";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

/**
 * Devuelve la ruta absoluta del archivo de base de datos SQLite
 * a partir de DATABASE_URL (formato file:...).
 */
export function getDbFilePath(): string {
  const match = url.match(/^file:(.+)$/);
  if (!match) {
    throw new Error(
      "DATABASE_URL debe ser una URL file: (ej. file:./prisma/dev.db)"
    );
  }
  const filePath = match[1].trim();
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

/**
 * Devuelve la ruta absoluta del archivo de BD y lanza si el archivo no existe.
 */
export function getDbFilePathOrThrow(): string {
  const dbPath = getDbFilePath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`No existe el archivo de base de datos: ${dbPath}`);
  }
  return dbPath;
}
