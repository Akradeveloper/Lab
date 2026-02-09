import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/project-submissions/[submissionId]/approve/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectSubmission: { findUnique: vi.fn(), update: vi.fn() },
    progress: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    lesson: { findMany: vi.fn() },
    certificate: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("POST /api/admin/project-submissions/[submissionId]/approve", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.update).mockResolvedValue({} as never);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.progress.create).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta submissionId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de entrega requerido");
  });

  it("devuelve 404 si la entrega no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Entrega no encontrada");
  });

  it("devuelve 400 si la entrega no está pendiente", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      lessonId: "l1",
      status: "APPROVED",
      lesson: { id: "l1", moduleId: "m1", submodule: null },
    } as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("La entrega no está pendiente de revisión");
  });

  it("devuelve 200 al aprobar entrega pendiente", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      lessonId: "l1",
      status: "PENDING",
      lesson: { id: "l1", moduleId: "m1", submodule: { moduleId: "m1" } },
    } as never);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([{ lessonId: "l1" }] as never);
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.certificate.create).mockResolvedValue({ id: "cert1" } as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.certificateId === "string" || data.certificateId === null).toBe(true);
  });

  it("devuelve 500 cuando update rechaza tras encontrar entrega pendiente", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      lessonId: "l1",
      status: "PENDING",
      lesson: { id: "l1", moduleId: "m1", submodule: { moduleId: "m1" } },
    } as never);
    vi.mocked(prisma.projectSubmission.update).mockRejectedValue(new Error("DB error"));
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al aprobar");
  });

  it("devuelve 200 y ejecuta catch del certificado cuando certificate.create rechaza (L100-101)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      lessonId: "l1",
      status: "PENDING",
      lesson: { id: "l1", moduleId: "m1", submodule: { moduleId: "m1" } },
    } as never);
    vi.mocked(prisma.projectSubmission.update).mockResolvedValue({} as never);
    vi.mocked(prisma.progress.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.progress.create).mockResolvedValue({} as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([{ lessonId: "l1" }] as never);
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.certificate.create).mockRejectedValue(new Error("cert create failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith("Error al verificar/emitir certificado:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
