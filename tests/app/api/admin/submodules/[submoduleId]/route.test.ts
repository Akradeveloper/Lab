import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/admin/submodules/[submoduleId]/route";

vi.mock("@/lib/api-auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submodule: {
      findUnique: vi.fn(),
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

describe("GET /api/admin/submodules/[submoduleId]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 400 si falta submoduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ submoduleId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de submódulo requerido");
  });

  it("devuelve 404 si el submódulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ submoduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Submódulo no encontrado");
  });

  it("devuelve 200 con el submódulo y su módulo", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      moduleId: "m1",
      title: "Sub 1",
      description: "Desc",
      order: 0,
      createdAt: new Date(),
      module: { id: "m1", title: "Módulo 1" },
    } as never);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("s1");
    expect(data.title).toBe("Sub 1");
    expect(data.module).toEqual({ id: "m1", title: "Módulo 1" });
  });
});

describe("PUT /api/admin/submodules/[submoduleId]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.update).mockResolvedValue({
      id: "s1",
      moduleId: "m1",
      title: "Sub actualizado",
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
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si el título está vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El título no puede estar vacío");
  });

  it("devuelve 404 si el submódulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.update).mockRejectedValue({ code: "P2025" });
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nuevo título" }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ submoduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Submódulo no encontrado");
  });

  it("devuelve 200 con submódulo actualizado", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nuevo título" }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Sub actualizado");
  });

  it("devuelve 200 con description vacío y asigna data.description null (L50)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ submoduleId: "s1" }) });
    expect(res.status).toBe(200);
    expect(prisma.submodule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      })
    );
  });

  it("devuelve 200 con solo order (L56-57)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: 3 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ submoduleId: "s1" }) });
    expect(res.status).toBe(200);
    expect(prisma.submodule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 3 }),
      })
    );
  });

  it("devuelve 500 cuando update rechaza con error distinto de P2025 (L84)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.update).mockRejectedValue(new Error("DB constraint"));
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ submoduleId: "s1" }) });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

describe("DELETE /api/admin/submodules/[submoduleId]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.delete).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 200 con ok: true al eliminar", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
