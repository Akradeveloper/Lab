import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRegisterRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const rateLimitError = checkRegisterRateLimit(request);
    if (rateLimitError) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 });
    }

    const body = await request.json();
    const { email, password, name, confirmPassword, website, turnstileToken } = body;

    // Honeypot: si un bot rellena este campo, rechazar sin revelar el motivo
    if (website && String(website).trim() !== "") {
      return NextResponse.json(
        { error: "Error al registrar" },
        { status: 400 }
      );
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (secret) {
      const token = typeof turnstileToken === "string" ? turnstileToken.trim() : "";
      if (!token || token.length > 2048) {
        return NextResponse.json(
          { error: "Verificación de seguridad incorrecta. Intenta de nuevo." },
          { status: 400 }
        );
      }
      const forwarded = request.headers.get("x-forwarded-for");
      const realIp = request.headers.get("x-real-ip");
      const remoteip = forwarded?.split(",")[0]?.trim() ?? realIp ?? undefined;
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          ...(remoteip && { remoteip }),
        }).toString(),
      });
      const verifyData = (await verifyRes.json()) as { success?: boolean };
      if (!verifyData.success) {
        return NextResponse.json(
          { error: "Verificación de seguridad incorrecta. Intenta de nuevo." },
          { status: 400 }
        );
      }
    }

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Faltan email, contraseña o nombre" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (trimmedEmail.length > 254) {
      return NextResponse.json(
        { error: "El email es demasiado largo" },
        { status: 400 }
      );
    }
    // Formato básico de email (local@dominio.ext)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "El formato del email no es válido" },
        { status: 400 }
      );
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: "El nombre no puede superar 100 caracteres" },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "La contraseña no puede superar 128 caracteres" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "La contraseña debe incluir al menos una mayúscula" },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: "La contraseña debe incluir al menos una minúscula" },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "La contraseña debe incluir al menos un número" },
        { status: 400 }
      );
    }

    if (typeof confirmPassword === "string" && password !== confirmPassword) {
      return NextResponse.json(
        { error: "Las contraseñas no coinciden" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: trimmedName,
        passwordHash,
        role: "ALUMNO",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error en registro:", e);
    }
    return NextResponse.json(
      { error: "Error al registrar" },
      { status: 500 }
    );
  }
}
