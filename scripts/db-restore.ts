import "dotenv/config";
import fs from "fs";
import path from "path";
import readline from "readline";
import { restoreFromJson } from "../src/lib/db-backup-restore";
import { isMySQL } from "../src/lib/database-url";
import { prisma } from "../src/lib/prisma";

const url = process.env.DATABASE_URL ?? "";

function getDbPath(): string {
  const match = url.match(/^file:(.+)$/);
  if (!match) {
    console.error("DATABASE_URL debe ser una URL file: (ej. file:./prisma/dev.db)");
    process.exit(1);
  }
  const filePath = match[1].trim();
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

function getBackupPathSqlite(): string {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const backupsDir = path.resolve(process.cwd(), "backups");

  if (args.length > 0) {
    const candidate = path.isAbsolute(args[0])
      ? args[0]
      : path.resolve(process.cwd(), args[0]);
    if (fs.existsSync(candidate)) return candidate;
    console.error(`No existe el archivo de backup: ${candidate}`);
    process.exit(1);
  }

  if (!fs.existsSync(backupsDir)) {
    console.error("No existe la carpeta backups/. Indica la ruta del backup: npm run db:restore -- backups/backup-xxx.db");
    process.exit(1);
  }

  const files = fs.readdirSync(backupsDir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => ({
      name: f,
      path: path.join(backupsDir, f),
      mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.error("No hay archivos .db en backups/.");
    process.exit(1);
  }

  return files[0].path;
}

function getBackupPathMySQL(): string {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const backupsDir = path.resolve(process.cwd(), "backups");

  if (args.length > 0) {
    const candidate = path.isAbsolute(args[0])
      ? args[0]
      : path.resolve(process.cwd(), args[0]);
    if (fs.existsSync(candidate)) return candidate;
    console.error(`No existe el archivo de backup: ${candidate}`);
    process.exit(1);
  }

  if (!fs.existsSync(backupsDir)) {
    console.error("No existe la carpeta backups/. Indica la ruta del backup: npm run db:restore -- backups/backup-xxx.json");
    process.exit(1);
  }

  const files = fs.readdirSync(backupsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      path: path.join(backupsDir, f),
      mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.error("No hay archivos .json en backups/.");
    process.exit(1);
  }

  return files[0].path;
}

function askConfirm(backupPath: string, targetDesc: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(
      `Se va a sobrescribir la base de datos actual (${targetDesc}) con el backup (${backupPath}). ¿Continuar? (s/N): `,
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === "s" || answer.trim().toLowerCase() === "si");
      }
    );
  });
}

async function mainMySQL() {
  const backupPath = getBackupPathMySQL();
  const force = process.argv.includes("--force");

  if (!force) {
    const ok = await askConfirm(backupPath, "MySQL");
    if (!ok) {
      console.log("Restauración cancelada.");
      process.exit(0);
    }
  }

  const text = fs.readFileSync(backupPath, "utf8");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("El archivo no es un JSON válido.");
    process.exit(1);
  }

  await restoreFromJson(prisma, json);
  await prisma.$disconnect();
  console.log("Restauración completada.");
}

async function mainSqlite() {
  if (!url.startsWith("file:")) {
    console.error(
      "Los scripts de restore por archivo son solo para SQLite o MySQL. Con SQLite use DATABASE_URL file:..."
    );
    process.exit(1);
  }

  const backupPath = getBackupPathSqlite();
  const dbPath = getDbPath();
  const force = process.argv.includes("--force");

  if (!force) {
    const ok = await askConfirm(backupPath, dbPath);
    if (!ok) {
      console.log("Restauración cancelada.");
      process.exit(0);
    }
  }

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.copyFileSync(backupPath, dbPath);
  console.log(`Restauración completada: ${dbPath}`);
}

async function main() {
  if (isMySQL()) {
    await mainMySQL();
  } else {
    await mainSqlite();
  }
}

main();