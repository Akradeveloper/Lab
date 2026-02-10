import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/modules/[moduleId]/lessons/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: { findUnique: vi.fn() },
    lesson: { findMany: vi.fn(), create: vi.fn() },
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("GET /api/admin/modules/[moduleId]/lessons", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Módulo no encontrado");
  });

  it("devuelve 400 si el módulo tiene submódulos", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 2 },
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("submódulos");
  });

  it("devuelve 200 con lista de lecciones", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { id: "l1", title: "Lección 1", content: "", order: 0, moduleId: "m1", submoduleId: null, difficulty: null, lessonType: "standard", createdAt: new Date(), _count: { exercises: 2 } },
    ] as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe("l1");
    expect(data[0].title).toBe("Lección 1");
  });
});

describe("POST /api/admin/modules/[moduleId]/lessons", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.create).mockResolvedValue({
      id: "l1",
      title: "Nueva",
      content: "",
      order: 0,
      moduleId: "m1",
      submoduleId: null,
      lessonType: "standard",
      difficulty: null,
      createdAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Título" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Título" }) }),
      { params: Promise.resolve({ moduleId: "" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Título" }) }),
      { params: Promise.resolve({ moduleId: "inexistente" }) }
    );
    expect(res.status).toBe(404);
  });

  it("devuelve 400 si el módulo tiene submódulos", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 1 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Título" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si falta título", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("título");
  });

  it("devuelve 200 y crea lección", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Nueva lección" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBeDefined();
  });

  it("devuelve 200 con difficulty y lessonType válidos (L74-81)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.create).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "",
      order: 0,
      moduleId: "m1",
      submoduleId: null,
      lessonType: "project",
      difficulty: "JUNIOR",
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ title: "Lección", difficulty: "JUNIOR", lessonType: "project" }),
      }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(200);
    expect(prisma.lesson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          difficulty: "JUNIOR",
          lessonType: "project",
        }),
      })
    );
  });

  it("devuelve 404 cuando create rechaza con P2003", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.create).mockRejectedValue({ code: "P2003" });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Nueva" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Módulo no encontrado");
  });

  it("devuelve 500 cuando prisma.lesson.create rechaza con error distinto de P2003", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.create).mockRejectedValue(new Error("DB error"));
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Nueva" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al crear la lección");
  });

  it("L99: ejecuta console.error en catch cuando create falla y NODE_ENV no production", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.create).mockRejectedValueOnce(new Error("DB fail"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(
        new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Nueva" }) }),
        { params: Promise.resolve({ moduleId: "m1" }) }
      );
      expect(res.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith("Error al crear lección:", expect.any(Error));
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("POST catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.create).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(
        new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Nueva" }) }),
        { params: Promise.resolve({ moduleId: "m1" }) }
      );
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
