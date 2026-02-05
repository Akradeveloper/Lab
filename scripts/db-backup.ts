import "dotenv/config";
import fs from "fs";
import path from "path";

const url = process.env.DATABASE_URL ?? "";

if (!url.startsWith("file:")) {
  console.error(
    "Los scripts de backup por archivo son solo para SQLite. Con MySQL use mysqldump en el servidor."
  );
  process.exit(1);
}

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

function main() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`No existe el archivo de base de datos: ${dbPath}`);
    process.exit(1);
  }

  const outArg = parseOutArg();
  const backupsDir = path.resolve(process.cwd(), "backups");

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
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    destPath = path.join(backupsDir, `backup-${timestamp}.db`);
  }

  fs.copyFileSync(dbPath, destPath);
  console.log(`Backup guardado en: ${destPath}`);
}

main();
