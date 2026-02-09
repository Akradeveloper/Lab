import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { authOptions } from "@/lib/auth";
import { getAppConfigNumber } from "@/lib/app-config";
import { prisma } from "@/lib/prisma";
import type { ProjectSubmissionType } from "@prisma/client";

type Params = { params: Promise<{ lessonId: string }> };

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXTENSIONS = [".zip", ".tar.gz", ".tgz", ".tar"];
const UPLOAD_BASE = "uploads/project-submissions";

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function getAllowedExtension(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return lower.slice(-7) === ".tar.gz" ? ".tar.gz" : ".tgz";
  for (const ext of ALLOWED_EXTENSIONS) {
    if (ext.length > 1 && lower.endsWith(ext)) return ext;
  }
  return null;
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (session.user.role !== "ALUMNO") {
    return NextResponse.json({ error: "Solo los alumnos pueden entregar proyectos" }, { status: 403 });
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json(
      { error: "ID de lección requerido" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, lessonType: true },
    });

    if (!lesson || (lesson.lessonType ?? "standard") !== "project") {
      return NextResponse.json(
        { error: "Lección no encontrada o no es una lección de proyecto" },
        { status: 404 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    let submissionType: ProjectSubmissionType;
    let url: string | null = null;
    let filePath: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const type = body?.type;
      if (type !== "url" || typeof body?.url !== "string") {
        return NextResponse.json(
          { error: "Se requiere type: 'url' y url (string)" },
          { status: 400 }
        );
      }
      const rawUrl = body.url.trim();
      if (!rawUrl || !isValidUrl(rawUrl)) {
        return NextResponse.json(
          { error: "URL no válida" },
          { status: 400 }
        );
      }
      submissionType = "URL";
      url = rawUrl;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { error: "Selecciona un archivo comprimido (.zip, .tar.gz)" },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "El archivo supera el tamaño máximo permitido (20 MB)" },
          { status: 400 }
        );
      }
      const ext = getAllowedExtension(file.name);
      if (!ext) {
        return NextResponse.json(
          { error: "Solo se permiten archivos .zip, .tar.gz o .tar" },
          { status: 400 }
        );
      }
      const timestamp = Date.now();
      const safeName = `${timestamp}-${(file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const relativeDir = `${UPLOAD_BASE}/${userId}/${lessonId}`;
      const fullDir = path.join(process.cwd(), relativeDir);
      fs.mkdirSync(fullDir, { recursive: true });
      const relativePath = `${relativeDir}/${safeName}`;
      const fullPath = path.join(process.cwd(), relativePath);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(fullPath, buffer);
      submissionType = "FILE";
      filePath = relativePath;
    } else {
      return NextResponse.json(
        { error: "Envía JSON con type y url, o multipart con file" },
        { status: 400 }
      );
    }

    const existing = await prisma.projectSubmission.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (existing) {
      if (existing.status === "APPROVED") {
        return NextResponse.json(
          { error: "Esta entrega ya fue aprobada; no puedes modificarla" },
          { status: 400 }
        );
      }
      if (existing.status === "REJECTED" && existing.rejectedAt) {
        const cooldownHours = await getAppConfigNumber(
          "project_submission_cooldown_hours",
          72
        );
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        const elapsed = Date.now() - existing.rejectedAt.getTime();
        if (elapsed < cooldownMs) {
          const retryAfter = new Date(
            existing.rejectedAt.getTime() + cooldownMs
          );
          return NextResponse.json(
            {
              error:
                "Debes esperar al menos 72 horas tras un rechazo para volver a enviar.",
              retryAfter: retryAfter.toISOString(),
            },
            { status: 400 }
          );
        }
      }
      if (existing.submissionType === "FILE" && existing.filePath) {
        const oldFull = path.join(process.cwd(), existing.filePath);
        if (fs.existsSync(oldFull)) fs.unlinkSync(oldFull);
      }
      const updated = await prisma.projectSubmission.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          submissionType,
          url: submissionType === "URL" ? url : null,
          filePath: submissionType === "FILE" ? filePath : null,
          submittedAt: new Date(),
          rejectedAt: null,
        },
      });
      return NextResponse.json({
        ok: true,
        submission: {
          id: updated.id,
          status: updated.status,
          submissionType: updated.submissionType,
          submittedAt: updated.submittedAt,
        },
      });
    }

    const created = await prisma.projectSubmission.create({
      data: {
        userId,
        lessonId,
        status: "PENDING",
        submissionType,
        url: submissionType === "URL" ? url : null,
        filePath: submissionType === "FILE" ? filePath : null,
      },
    });

    return NextResponse.json({
      ok: true,
      submission: {
        id: created.id,
        status: created.status,
        submissionType: created.submissionType,
        submittedAt: created.submittedAt,
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error al guardar entrega de proyecto:", e);
    }
    return NextResponse.json(
      { error: "Error al guardar la entrega" },
      { status: 500 }
    );
  }
}
