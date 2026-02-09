import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/curriculum/lessons/[lessonId]/project-submit/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: vi.fn() },
    projectSubmission: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({
  getAppConfigNumber: vi.fn().mockResolvedValue(72),
}));
vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));
vi.mock("path", () => {
  const join = vi.fn((...args: string[]) => args.join("/"));
  const basename = vi.fn((p: string) => p.split("/").pop() ?? "file");
  return { default: { join, basename }, join, basename };
});

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

const sessionAlumno = {
  user: { id: "u1", email: "a@b.com", name: "User", role: "ALUMNO" as const },
  expires: "",
};

describe("POST /api/curriculum/lessons/[lessonId]/project-submit", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.create).mockResolvedValue({
      id: "sub1",
      status: "PENDING",
      submissionType: "URL",
      submittedAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 403 si el usuario no es ALUMNO", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "a1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
      expires: "",
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url: "https://example.com" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("alumnos");
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

  it("devuelve 404 si la lección no existe o no es proyecto", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url: "https://example.com" }),
      }),
      { params: Promise.resolve({ lessonId: "inexistente" }) }
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("proyecto");
  });

  it("devuelve 400 si body no tiene type url y url válida", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url: "no-es-url" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("URL no válida");
  });

  it("devuelve 200 al enviar URL válida (crea entrega)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url: "https://example.com/repo" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.submission).toBeDefined();
    expect(data.submission.status).toBe("PENDING");
  });

  it("devuelve 400 si content-type no es JSON ni multipart", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "foo",
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("JSON");
  });

  it("devuelve 400 con multipart sin file", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    const formData = new FormData();
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: formData }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("archivo");
  });

  it("devuelve 400 si extensión no permitida", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    const formData = new FormData();
    formData.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: formData }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/\.zip|permiten/);
  });

  it("devuelve 200 con multipart y archivo .zip", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.create).mockResolvedValue({
      id: "sub1",
      status: "PENDING",
      submissionType: "FILE",
      submittedAt: new Date(),
    } as never);
    const formData = new FormData();
    formData.append("file", new File(["content"], "submission.zip", { type: "application/zip" }));
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: formData }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.submission.submissionType).toBe("FILE");
  });

  it("devuelve 400 si entrega existente está APPROVED", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "sub1",
      status: "APPROVED",
      submissionType: "URL",
      url: "https://x.com",
      filePath: null,
      submittedAt: new Date(),
      rejectedAt: null,
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url: "https://example.com/new" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("aprobada");
  });

  it("devuelve 400 si REJECTED y aún en cooldown", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    const rejectedAt = new Date(Date.now() - 1000);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "sub1",
      status: "REJECTED",
      submissionType: "URL",
      url: null,
      filePath: null,
      submittedAt: new Date(),
      rejectedAt,
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url: "https://example.com/new" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/esperar|72/);
  });

  it("devuelve 200 si REJECTED y fuera de cooldown (update)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    const rejectedAt = new Date(Date.now() - 80 * 60 * 60 * 1000);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "sub1",
      status: "REJECTED",
      submissionType: "URL",
      url: null,
      filePath: null,
      submittedAt: new Date(),
      rejectedAt,
    } as never);
    vi.mocked(prisma.projectSubmission.update).mockResolvedValue({
      id: "sub1",
      status: "PENDING",
      submissionType: "URL",
      submittedAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url: "https://example.com/new" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("devuelve 500 si prisma.create lanza", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.create).mockRejectedValue(new Error("DB error"));
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url: "https://example.com/repo" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAlumno as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.create).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(
        new Request("https://x.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "url", url: "https://example.com/repo" }),
        }),
        { params: Promise.resolve({ lessonId: "l1" }) }
      );
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
