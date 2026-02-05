import fs from "fs";
import path from "path";

const url = process.env.DATABASE_URL ?? "";

/**
 * Devuelve la ruta absoluta del archivo de base de datos SQLite
 * a partir de DATABASE_URL (formato file:...).
 * Con MySQL no aplica: lanza error indicando usar mysqldump.
 */
export function getDbFilePath(): string {
  if (!url.startsWith("file:")) {
    throw new Error(
      "El backup/restore por archivo solo está disponible con SQLite (DATABASE_URL file:...). Con MySQL use mysqldump en el servidor."
    );
  }
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
 * Con MySQL lanza el mismo error que getDbFilePath.
 */
export function getDbFilePathOrThrow(): string {
  if (!url.startsWith("file:")) {
    throw new Error(
      "El backup/restore por archivo solo está disponible con SQLite (DATABASE_URL file:...). Con MySQL use mysqldump en el servidor."
    );
  }
  const dbPath = getDbFilePath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`No existe el archivo de base de datos: ${dbPath}`);
  }
  return dbPath;
}
