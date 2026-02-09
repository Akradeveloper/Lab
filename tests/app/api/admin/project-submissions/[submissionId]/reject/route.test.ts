import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/project-submissions/[submissionId]/reject/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectSubmission: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("POST /api/admin/project-submissions/[submissionId]/reject", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.update).mockResolvedValue({} as never);
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
      status: "REJECTED",
    } as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("La entrega no está pendiente de revisión");
  });

  it("devuelve 200 al rechazar entrega pendiente", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "s1",
      status: "PENDING",
    } as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submissionId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
