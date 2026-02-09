import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminSession } from "@/lib/api-auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Cuerpo de la petición inválido");
  }

  const password =
    typeof body?.password === "string" ? body.password.trim() : "";
  if (!password) return badRequest("La contraseña es obligatoria");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return notFound("Usuario no encontrado");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.exerciseAttempt.deleteMany();
      await tx.lessonCheckAttempt.deleteMany();
      await tx.progress.deleteMany();
      await tx.exercise.deleteMany();
      await tx.lesson.deleteMany();
      await tx.submodule.deleteMany();
      await tx.module.deleteMany();
      await tx.user.deleteMany({
        where: { id: { not: session.user!.id } },
      });
    });
    return NextResponse.json({
      message: "Base de datos vaciada correctamente",
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al vaciar la base de datos:", e);
    }
    return serverError("Error al vaciar la base de datos");
  }
}
