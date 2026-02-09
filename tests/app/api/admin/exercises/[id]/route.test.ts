import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "@/app/api/admin/exercises/[id]/route";

vi.mock("@/lib/api-auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exercise: {
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

describe("PUT /api/admin/exercises/[id]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.exercise.update).mockResolvedValue({
      id: "e1",
      lessonId: "l1",
      type: "MULTIPLE_CHOICE",
      question: "Pregunta",
      options: "[]",
      correctAnswer: "0",
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Pregunta" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta id", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Pregunta" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de ejercicio requerido");
  });

  it("devuelve 400 si tipo es inválido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "INVALID" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Tipo de ejercicio inválido");
  });

  it("devuelve 400 si enunciado está vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "   " }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("enunciado");
  });

  it("devuelve 400 si order no es entero", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: 1.5 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("orden");
  });

  it("devuelve 200 con solo order y asigna data.order", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: 1 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 1 }),
      })
    );
  });

  it("devuelve 200 con actualización parcial (question)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.update).mockResolvedValue({
      id: "e1",
      lessonId: "l1",
      type: "MULTIPLE_CHOICE",
      question: "Nueva pregunta",
      options: "[]",
      correctAnswer: "0",
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Nueva pregunta" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.question).toBe("Nueva pregunta");
  });

  it("devuelve 200 con options como string", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: '["Opción 1","Opción 2"]' }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ options: '["Opción 1","Opción 2"]' }),
      })
    );
  });

  it("devuelve 200 con options como array", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "MULTIPLE_CHOICE", options: ["A", "B", "C"] }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ options: '["A","B","C"]' }),
      })
    );
  });

  it("asigna options [] cuando options no es string/array/objeto", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: null }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ options: "[]" }),
      })
    );
  });

  it("devuelve 200 con options como objeto (CODE)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CODE",
        options: { language: "javascript", template: "fn()", testCases: [] },
      }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          options: expect.any(String),
          type: "CODE",
        }),
      })
    );
  });

  it("devuelve 200 con correctAnswer CODE (string)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CODE", correctAnswer: "return 1;" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctAnswer: "return 1;" }),
      })
    );
  });

  it("devuelve 200 con correctAnswer CODE no string (asigna vacío, L51 rama else)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CODE", correctAnswer: 42 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctAnswer: "" }),
      })
    );
  });

  it("devuelve 200 con correctAnswer DESARROLLO (vacío)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DESARROLLO", correctAnswer: "cualquier cosa" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctAnswer: "" }),
      })
    );
  });

  it("devuelve 200 con correctAnswer TRUE_FALSE true", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "TRUE_FALSE", correctAnswer: true }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctAnswer: "true" }),
      })
    );
  });

  it("devuelve 200 con correctAnswer TRUE_FALSE false (L56 rama JSON.stringify(false))", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "TRUE_FALSE", correctAnswer: false }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctAnswer: "false" }),
      })
    );
  });

  it("devuelve 200 con correctAnswer TRUE_FALSE string 'true'", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "TRUE_FALSE", correctAnswer: "true" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctAnswer: "true" }),
      })
    );
  });

  it("devuelve 200 con correctAnswer MULTIPLE_CHOICE (índice entero)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "MULTIPLE_CHOICE", correctAnswer: 2 }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctAnswer: "2" }),
      })
    );
  });

  it("devuelve 200 con correctAnswer no entero (rama por defecto -> 0)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correctAnswer: "texto" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(prisma.exercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctAnswer: "0" }),
      })
    );
  });

  it("devuelve 404 si el ejercicio no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.update).mockRejectedValue({ code: "P2025" });
    const req = new Request("https://example.com", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Pregunta" }),
    });
    const res = await PUT(req, {
      params: Promise.resolve({ id: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Ejercicio no encontrado");
  });
});

describe("DELETE /api/admin/exercises/[id]", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.exercise.delete).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ id: "e1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta id", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ id: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de ejercicio requerido");
  });

  it("devuelve 404 si el ejercicio no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.delete).mockRejectedValue({ code: "P2025" });
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ id: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Ejercicio no encontrado");
  });

  it("devuelve 200 con ok: true al eliminar", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await DELETE(new Request("https://example.com"), {
      params: Promise.resolve({ id: "e1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
