import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido" },
      { status: 400 }
    );
  }

  const password =
    typeof body?.password === "string" ? body.password.trim() : "";
  if (!password) {
    return NextResponse.json(
      { error: "La contraseña es obligatoria" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 }
    );
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
    return NextResponse.json(
      { error: "Error al vaciar la base de datos" },
      { status: 500 }
    );
  }
}
