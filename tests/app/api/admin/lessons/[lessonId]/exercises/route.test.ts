import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/lessons/[lessonId]/exercises/route";

vi.mock("@/lib/api-auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exercise: { findMany: vi.fn(), create: vi.fn() },
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("GET /api/admin/lessons/[lessonId]/exercises", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 400 si lessonId está vacío (GET L13)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ lessonId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de lección requerido");
  });

  it("devuelve 200 con lista de ejercicios", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([
      {
        id: "e1",
        lessonId: "l1",
        type: "MULTIPLE_CHOICE",
        question: "Pregunta",
        options: "[]",
        correctAnswer: "0",
        order: 0,
        createdAt: new Date(),
      },
    ] as never);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("e1");
    expect(data[0].question).toBe("Pregunta");
  });
});

describe("POST /api/admin/lessons/[lessonId]/exercises", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "MULTIPLE_CHOICE",
      question: "Pregunta",
      options: "[]",
      correctAnswer: "0",
      order: 0,
      createdAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ type: "MULTIPLE_CHOICE", question: "Q" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta lessonId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ type: "MULTIPLE_CHOICE", question: "Q" }),
      }),
      { params: Promise.resolve({ lessonId: "" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de lección requerido");
  });

  it("devuelve 400 si tipo inválido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ type: "INVALID", question: "Q" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Tipo de ejercicio inválido");
  });

  it("devuelve 400 si falta question o está vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ type: "MULTIPLE_CHOICE", question: "   " }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("enunciado");
  });

  it("devuelve 200 y crea ejercicio MULTIPLE_CHOICE", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "MULTIPLE_CHOICE",
      question: "¿Cuál es correcta?",
      options: '["A","B","C"]',
      correctAnswer: "1",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          type: "MULTIPLE_CHOICE",
          question: "¿Cuál es correcta?",
          options: ["A", "B", "C"],
          correctAnswer: 1,
        }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.question).toBe("¿Cuál es correcta?");
    expect(data.type).toBe("MULTIPLE_CHOICE");
  });

  it("devuelve 200 y crea ejercicio TRUE_FALSE con correctAnswer boolean", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "TRUE_FALSE",
      question: "Verdadero o falso",
      options: '["Verdadero","Falso"]',
      correctAnswer: "true",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          type: "TRUE_FALSE",
          question: "Verdadero o falso",
          correctAnswer: true,
        }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("TRUE_FALSE");
  });

  it("devuelve 200 y crea ejercicio TRUE_FALSE con correctAnswer string", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          type: "TRUE_FALSE",
          question: "Es falso",
          correctAnswer: "false",
        }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("devuelve 200 y crea ejercicio CODE con options objeto", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "CODE",
      question: "Escribe la función",
      options: '{"language":"javascript","template":"function f(){ }","testCases":[]}',
      correctAnswer: "return 1;",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          type: "CODE",
          question: "Escribe la función",
          options: { language: "javascript", template: "function f(){ }", testCases: [] },
          correctAnswer: "return 1;",
        }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("CODE");
  });

  it("devuelve 200 y crea ejercicio CODE con options mínimos (L55-64 defaults language/template)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "CODE",
      question: "Escribe código",
      options: '{"language":"javascript","template":"","testCases":[]}',
      correctAnswer: "",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          type: "CODE",
          question: "Escribe código",
          options: {},
          correctAnswer: 123,
        }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    expect(prisma.exercise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          options: expect.stringContaining("javascript"),
          correctAnswer: "",
        }),
      })
    );
  });

  it("devuelve 200 y crea ejercicio DESARROLLO", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "DESARROLLO",
      question: "Desarrolla el tema",
      options: "{}",
      correctAnswer: "",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          type: "DESARROLLO",
          question: "Desarrolla el tema",
        }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("DESARROLLO");
  });

  it("devuelve 404 cuando la lección no existe (P2003)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.create).mockRejectedValue({ code: "P2003" });
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ type: "MULTIPLE_CHOICE", question: "Q" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Lección no encontrada");
  });

  it("devuelve 500 cuando create falla con error distinto de P2003", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.exercise.create).mockRejectedValue(new Error("DB connection failed"));
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ type: "MULTIPLE_CHOICE", question: "Q" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al crear el ejercicio");
  });
});
