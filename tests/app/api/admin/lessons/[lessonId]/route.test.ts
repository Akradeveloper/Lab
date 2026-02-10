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

  it("devuelve 400 si lessonId está vacío (L15)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de lección requerido");
  });

  it("asigna content vacío cuando content no es string (L30)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título", content: 123 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(200);
    expect(prisma.lesson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: "" }),
      })
    );
  });

  it("devuelve 500 cuando update rechaza con error distinto de P2025 (L69 handlePrismaError)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.update).mockRejectedValue(new Error("DB constraint"));
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
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

  it("devuelve 200 con la lección actualizada cuando el body es válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const updatedLesson = {
      id: "l1",
      title: "Nuevo título",
      content: "Contenido",
      order: 1,
      difficulty: "JUNIOR",
      lessonType: "standard",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.lesson.update).mockResolvedValue(updatedLesson as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Nuevo título",
        content: "Contenido",
        order: 1,
        difficulty: "JUNIOR",
        lessonType: "standard",
      }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Nuevo título");
    expect(data.content).toBe("Contenido");
    expect(data.order).toBe(1);
    expect(data.difficulty).toBe("JUNIOR");
    expect(data.lessonType).toBe("standard");
  });

  it("devuelve 400 si el título está vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El título no puede estar vacío");
  });

  it("devuelve 400 si el orden no es un número entero", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título", order: 1.5 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El orden debe ser un número entero");
  });

  it("devuelve 200 con difficulty null y asigna data.difficulty = null", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.update).mockResolvedValue({
      id: "l1",
      title: "Título",
      content: "",
      order: 0,
      difficulty: null,
      lessonType: "standard",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título", difficulty: null }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(200);
    expect(prisma.lesson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ difficulty: null }),
      })
    );
  });

  it("devuelve 200 con difficulty vacío y asigna data.difficulty = null", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.update).mockResolvedValue({
      id: "l1",
      title: "Título",
      content: "",
      order: 0,
      difficulty: null,
      lessonType: "standard",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título", difficulty: "" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(200);
    expect(prisma.lesson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ difficulty: null }),
      })
    );
  });

  it("devuelve 400 si la dificultad no es válida", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título", difficulty: "INVALID" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Dificultad no válida; usa APRENDIZ, JUNIOR, MID, SENIOR o ESPECIALISTA");
  });

  it("devuelve 400 si el tipo de lección no es válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Título", lessonType: "invalid" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Tipo de lección no válido; usa standard o project");
  });

  it("devuelve 200 actualizando solo lessonType (L25 rama data con lessonType)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.update).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "",
      order: 0,
      lessonType: "project",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonType: "project" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ lessonId: "l1" }) });
    expect(res.status).toBe(200);
    expect(prisma.lesson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lessonType: "project" }),
      })
    );
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

  it("devuelve 404 si la lección a eliminar no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.delete).mockRejectedValue({ code: "P2025" });
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ lessonId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Lección no encontrada");
  });

  it("L69: devuelve 500 cuando delete rechaza con error distinto de P2025 (handlePrismaError)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.delete).mockRejectedValueOnce(new Error("DB constraint"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await DELETE(new Request("https://example.com"), {
        params: Promise.resolve({ lessonId: "l1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith("Error al eliminar lección:", expect.any(Error));
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("DELETE catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.delete).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await DELETE(new Request("https://example.com"), {
        params: Promise.resolve({ lessonId: "l1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
