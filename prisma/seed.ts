import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (existingAdmin) {
    console.log("Admin ya existe, omitiendo seed.");
    return;
  }
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      email: "admin@qalab.dev",
      name: "Admin QA Lab",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log("Admin de prueba creado: admin@qalab.dev / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
