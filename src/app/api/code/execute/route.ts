import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-responses";
import { prisma } from "@/lib/prisma";
import {
  getRedis,
  QUEUE_ALUMNOS,
  JOB_PREFIX,
  JOB_TTL_SEC,
} from "@/lib/redis";

const VALID_LANGS = ["python", "javascript", "java", "typescript", "java-playwright"];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  try {
    const body = await request.json();
    const { exerciseId, lessonId, code, language } = body ?? {};

    if (!exerciseId || !lessonId || typeof code !== "string") {
      return badRequest("Faltan exerciseId, lessonId o code");
    }
    if (!VALID_LANGS.includes(language)) {
      return badRequest("language debe ser python, javascript, java, typescript o java-playwright");
    }

    const exercise = await prisma.exercise.findFirst({
      where: { id: exerciseId, lessonId, type: "DESARROLLO" },
    });
    if (!exercise) {
      return badRequest("Ejercicio no encontrado o no es de tipo DESARROLLO");
    }

    let finalCode = code;
    try {
      const opts = JSON.parse(exercise.options) as {
        immutablePrefix?: string;
        immutableSuffix?: string;
      };
      const prefix = typeof opts?.immutablePrefix === "string" ? opts.immutablePrefix.trim() : "";
      const suffix = typeof opts?.immutableSuffix === "string" ? opts.immutableSuffix.trim() : "";
      if (prefix !== "" || suffix !== "") {
        finalCode =
          (prefix ? prefix + "\n" : "") + code.trim() + (suffix ? "\n" + suffix : "");
      }
    } catch {
      // Si options no es JSON válido, usar code tal cual
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Cola no disponible" },
        { status: 503 }
      );
    }

    const jobId = randomUUID();
    const jobKey = `${JOB_PREFIX}${jobId}`;
    const position = await redis.rpush(
      QUEUE_ALUMNOS,
      jobId
    );

    const jobState = {
      status: "PENDING",
      userId: session.user.id,
      exerciseId,
      lessonId,
      code: finalCode,
      language,
      source: "alumno",
      position,
      createdAt: Date.now(),
    };
    await redis.set(
      jobKey,
      JSON.stringify(jobState),
      "EX",
      JOB_TTL_SEC
    );

    return NextResponse.json({ jobId, position });
  } catch (e) {
    return serverError(e instanceof Error ? e.message : String(e));
  }
}
