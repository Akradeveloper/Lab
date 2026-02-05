import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import { getDatabaseUrl } from "../src/lib/database-url";

let url: string;
try {
  url = getDatabaseUrl();
} catch {
  console.error("Configuración de BD: define DATABASE_URL o DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER en .env");
  process.exit(1);
}
const adapter = new PrismaMariaDb(url);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("45822181vV!", 10);
    await prisma.user.create({
      data: {
        email: "esantamaria@qalab.dev",
        name: "Admin QA Lab",
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log("Admin de prueba creado: admin@qalab.dev / admin123");
  } else {
    console.log("Admin ya existe, omitiendo creación de admin.");
  }

  // Seed de ejemplo: un módulo con un submódulo, 2 lecciones y ejercicios
  const existingModule = await prisma.module.findFirst({});
  if (!existingModule) {
    const mod = await prisma.module.create({
      data: {
        title: "Introducción a QA",
        description: "Conceptos básicos de testing y calidad de software.",
        order: 0,
      },
    });
    const sub = await prisma.submodule.create({
      data: {
        moduleId: mod.id,
        title: "Introducción a QA",
        description: "Conceptos básicos de testing.",
        order: 0,
      },
    });
    const lesson1 = await prisma.lesson.create({
      data: {
        submoduleId: sub.id,
        title: "¿Qué es el testing?",
        content:
          "El **testing** es el proceso de verificar que un sistema se comporta como se espera. Incluye ejecutar el software y comparar los resultados con los requisitos.",
        order: 0,
      },
    });
    await prisma.exercise.create({
      data: {
        lessonId: lesson1.id,
        type: "TRUE_FALSE",
        question: "El testing sirve para encontrar defectos en el software.",
        options: JSON.stringify(["Verdadero", "Falso"]),
        correctAnswer: JSON.stringify(true),
        order: 0,
      },
    });
    const lesson2 = await prisma.lesson.create({
      data: {
        submoduleId: sub.id,
        title: "Tipos de pruebas",
        content:
          "Existen pruebas **funcionales** (¿hace lo que debe?) y **no funcionales** (rendimiento, usabilidad, etc.).",
        order: 1,
      },
    });
    await prisma.exercise.create({
      data: {
        lessonId: lesson2.id,
        type: "MULTIPLE_CHOICE",
        question: "¿Cuál es un tipo de prueba funcional?",
        options: JSON.stringify([
          "Prueba de carga",
          "Prueba de humo",
          "Prueba de usabilidad",
        ]),
        correctAnswer: JSON.stringify(1),
        order: 0,
      },
    });
    console.log("Módulo de ejemplo creado: Introducción a QA (submódulo con 2 lecciones y ejercicios).");
  } else {
    console.log("Módulos ya existen, omitiendo seed de currículo.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
