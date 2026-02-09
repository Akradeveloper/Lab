import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/curriculum/lessons/[lessonId]/complete/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: vi.fn(), findMany: vi.fn() },
    progress: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    certificate: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

const sessionAlumno = {
  user: { id: "u1", email: "a@b.com", name: "User", role: "ALUMNO" as const },
  expires: "",
};

describe("POST /api/curriculum/lessons/[lessonId]/complete", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.progress.create).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta lessonId", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de lección requerido");
  });

  it("devuelve 404 si la lección no existe", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Lección no encontrada");
  });

  it("devuelve 403 si es lección proyecto y el usuario no es admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
      moduleId: "m1",
      submodule: null,
    } as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("proyecto");
  });

  it("devuelve 200 con alreadyCompleted si ya tenía progreso", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "standard",
      moduleId: "m1",
      submodule: null,
    } as never);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue({
      id: "p1",
      userId: "u1",
      lessonId: "l1",
      courseId: "m1",
    } as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.alreadyCompleted).toBe(true);
  });

  it("devuelve 200 y crea progreso cuando no existía", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "standard",
      moduleId: "m1",
      submodule: null,
    } as never);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([{ lessonId: "l1" }] as never);
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.certificate.create).mockResolvedValue({ id: "cert1" } as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.alreadyCompleted).toBeUndefined();
    expect(data.certificateId).toBe("cert1");
  });

  it("devuelve 200 con certificateId cuando ya existía certificado del módulo", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "standard",
      moduleId: "m1",
      submodule: null,
    } as never);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([{ lessonId: "l1" }] as never);
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({ id: "existing-cert" } as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.certificateId).toBe("existing-cert");
  });

  it("devuelve 500 cuando progress.create lanza", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "standard",
      moduleId: "m1",
      submodule: null,
    } as never);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.progress.create).mockRejectedValue(new Error("DB error"));
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al guardar el progreso");
  });

  it("devuelve 200 sin certificateId cuando el bloque de certificado lanza (catch interno)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "standard",
      moduleId: "m1",
      submodule: null,
    } as never);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([{ lessonId: "l1" }] as never);
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.certificate.create).mockRejectedValue(new Error("Cert DB error"));
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.certificateId).toBeNull();
  });
});
