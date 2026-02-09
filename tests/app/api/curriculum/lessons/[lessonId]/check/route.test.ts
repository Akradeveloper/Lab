import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/curriculum/lessons/[lessonId]/check/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    exercise: { findMany: vi.fn() },
    lessonCheckAttempt: { create: vi.fn() },
    exerciseAttempt: { createMany: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

const session = {
  user: { id: "u1", email: "a@b.com", name: "User", role: "ALUMNO" as const },
  expires: "",
};

describe("POST /api/curriculum/lessons/[lessonId]/check", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([]);
    vi.mocked(prisma.lessonCheckAttempt.create).mockResolvedValue({} as never);
    vi.mocked(prisma.exerciseAttempt.createMany).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ answers: {} }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta lessonId", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ answers: {} }),
      }),
      { params: Promise.resolve({ lessonId: "" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de lección requerido");
  });

  it("devuelve 400 si no se envía answers como objeto", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("answers");
  });

  it("devuelve 200 con resultados correctos e incorrectos", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([
      {
        id: "ex1",
        type: "TRUE_FALSE",
        correctAnswer: "true",
        order: 0,
      },
      {
        id: "ex2",
        type: "MULTIPLE_CHOICE",
        correctAnswer: "1",
        order: 1,
      },
    ] as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ answers: { ex1: true, ex2: 0 } }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.allCorrect).toBeDefined();
  });

  it("ejercicio CODE: normaliza espacios/CRLF y marca correcto", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([
      {
        id: "exCode",
        type: "CODE",
        correctAnswer: "return 1;",
        order: 0,
      },
    ] as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({
          answers: { exCode: "  return 1;\r\n  " },
        }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.allCorrect).toBe(true);
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toEqual({ exerciseId: "exCode", correct: true });
  });

  it("ejercicio CODE: respuesta incorrecta marca incorrecto", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([
      {
        id: "exCode",
        type: "CODE",
        correctAnswer: "return 1;",
        order: 0,
      },
    ] as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ answers: { exCode: "return 0;" } }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.allCorrect).toBe(false);
    expect(data.results[0]).toEqual({ exerciseId: "exCode", correct: false });
  });

  it("TRUE_FALSE y MULTIPLE_CHOICE con respuestas incorrectas", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([
      { id: "exT", type: "TRUE_FALSE", correctAnswer: "true", order: 0 },
      { id: "exM", type: "MULTIPLE_CHOICE", correctAnswer: "1", order: 1 },
    ] as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ answers: { exT: false, exM: 0 } }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.allCorrect).toBe(false);
    const t = data.results.find((r: { exerciseId: string }) => r.exerciseId === "exT");
    const m = data.results.find((r: { exerciseId: string }) => r.exerciseId === "exM");
    expect(t.correct).toBe(false);
    expect(m.correct).toBe(false);
  });

  it("ejercicio DESARROLLO se ignora (continue) y devuelve 200", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([
      { id: "exD", type: "DESARROLLO", correctAnswer: "", order: 0 },
    ] as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ answers: {} }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(0);
    expect(data.allCorrect).toBe(true);
  });

  it("devuelve 500 cuando falla findMany", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findMany).mockRejectedValue(new Error("DB"));
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ answers: {} }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("comprobar");
  });

  it("devuelve 200 aunque falle guardar intentos (catch interno)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([]);
    vi.mocked(prisma.lessonCheckAttempt.create).mockRejectedValue(new Error("DB"));
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ answers: {} }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toEqual([]);
    expect(data.allCorrect).toBe(true);
  });
});
