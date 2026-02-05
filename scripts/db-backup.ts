import "dotenv/config";
import fs from "fs";
import path from "path";
import { exportBackupToJson } from "../src/lib/db-backup-restore";
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

function parseOutArg(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--out="));
  if (!arg) return null;
  return path.resolve(process.cwd(), arg.slice("--out=".length));
}

async function mainMySQL() {
  const outArg = parseOutArg();
  const backupsDir = path.resolve(process.cwd(), "backups");
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

  let destPath: string;
  if (outArg) {
    destPath = outArg;
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } else {
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    destPath = path.join(backupsDir, `backup-${timestamp}.json`);
  }

  const backup = await exportBackupToJson(prisma);
  fs.writeFileSync(destPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup guardado en: ${destPath}`);
  await prisma.$disconnect();
}

function mainSqlite() {
  if (!url.startsWith("file:")) {
    console.error(
      "Los scripts de backup por archivo son solo para SQLite o MySQL. Con SQLite use DATABASE_URL file:..."
    );
    process.exit(1);
  }

  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`No existe el archivo de base de datos: ${dbPath}`);
    process.exit(1);
  }

  const outArg = parseOutArg();
  const backupsDir = path.resolve(process.cwd(), "backups");
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

  let destPath: string;
  if (outArg) {
    destPath = outArg;
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } else {
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    destPath = path.join(backupsDir, `backup-${timestamp}.db`);
  }

  fs.copyFileSync(dbPath, destPath);
  console.log(`Backup guardado en: ${destPath}`);
}

async function main() {
  if (isMySQL()) {
    await mainMySQL();
  } else {
    mainSqlite();
  }
}

main();