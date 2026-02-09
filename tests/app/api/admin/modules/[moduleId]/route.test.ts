import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "@/app/api/admin/modules/[moduleId]/route";

vi.mock("@/lib/api-auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: {
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

describe("PUT /api/admin/modules/[moduleId]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.update).mockResolvedValue({
      id: "m1",
      title: "Módulo actualizado",
      description: null,
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
    const res = await PUT(req, {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título" }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ moduleId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de módulo requerido");
  });

  it("devuelve 400 si el título está vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El título no puede estar vacío");
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.update).mockRejectedValue({ code: "P2025" });
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nuevo título" }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ moduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Módulo no encontrado");
  });

  it("devuelve 200 y el módulo actualizado con body válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const updated = {
      id: "m1",
      title: "Título actualizado",
      description: "Desc",
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.module.update).mockResolvedValue(updated as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Título actualizado",
        description: "Desc",
        order: 1,
      }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Título actualizado");
    expect(data.order).toBe(1);
  });
});

describe("DELETE /api/admin/modules/[moduleId]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.delete).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de módulo requerido");
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.delete).mockRejectedValue({ code: "P2025" });
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Módulo no encontrado");
  });

  it("devuelve 200 con ok: true al eliminar", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
