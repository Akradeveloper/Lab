import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "@/app/api/admin/lessons/[lessonId]/route";

vi.mock("@/lib/api-auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("PUT /api/admin/lessons/[lessonId]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.lesson.update).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "",
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(403);
  });

  it("devuelve 404 si la lección no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.update).mockRejectedValue({ code: "P2025" });
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nuevo título" }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ lessonId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Lección no encontrada");
  });
});

describe("DELETE /api/admin/lessons/[lessonId]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.lesson.delete).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 200 con ok: true al eliminar", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
