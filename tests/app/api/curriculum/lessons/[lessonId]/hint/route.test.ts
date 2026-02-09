import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/curriculum/lessons/[lessonId]/hint/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { exercise: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

const session = {
  user: { id: "u1", email: "a@b.com", name: "User", role: "ALUMNO" as const },
  expires: "",
};

describe("POST /api/curriculum/lessons/[lessonId]/hint", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.exercise.findFirst).mockResolvedValue(null);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex1" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta exerciseId", async () => {
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
    expect(data.error).toBe("Se requiere exerciseId");
  });

  it("devuelve 404 si el ejercicio no existe", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findFirst).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "inexistente" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Ejercicio no encontrado");
  });

  it("devuelve 200 con hint (pista local sin API key)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findFirst).mockResolvedValue({
      id: "ex1",
      type: "TRUE_FALSE",
      question: "¿Es cierto?",
      options: null,
      correctAnswer: "true",
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex1" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hint).toBeDefined();
    expect(typeof data.hint).toBe("string");
  });

  it("devuelve 200 con hint para MULTIPLE_CHOICE (incluye opciones en el prompt)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.mocked(prisma.exercise.findFirst).mockResolvedValue({
      id: "ex1",
      type: "MULTIPLE_CHOICE",
      question: "¿Cuál es correcto?",
      options: JSON.stringify(["A", "B", "C"]),
      correctAnswer: "B",
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex1" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hint).toBeDefined();
    vi.unstubAllEnvs();
  });

  it("devuelve 200 con pista local cuando la API de OpenAI falla (!res.ok)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.mocked(prisma.exercise.findFirst).mockResolvedValue({
      id: "ex1",
      type: "CODE",
      question: "Escribe una función",
      options: null,
      correctAnswer: "code",
    } as never);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex1" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hint).toBeDefined();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("devuelve 200 con hint desde OpenAI cuando la API responde ok", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.mocked(prisma.exercise.findFirst).mockResolvedValue({
      id: "ex1",
      type: "TRUE_FALSE",
      question: "Pregunta",
      options: null,
      correctAnswer: "true",
    } as never);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: " Pista desde IA " } }],
        }),
    }));
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex1" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hint).toBe("Pista desde IA");
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("devuelve 500 cuando ocurre un error inesperado", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.exercise.findFirst).mockRejectedValue(new Error("DB error"));
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex1" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al generar la pista");
  });

  it("devuelve 500 cuando fetch a OpenAI lanza", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.mocked(prisma.exercise.findFirst).mockResolvedValue({
      id: "ex1",
      type: "TRUE_FALSE",
      question: "P?",
      options: null,
      correctAnswer: "true",
    } as never);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex1" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al generar la pista");
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("devuelve 200 con MULTIPLE_CHOICE cuando options no es JSON válido (catch interno)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.mocked(prisma.exercise.findFirst).mockResolvedValue({
      id: "ex1",
      type: "MULTIPLE_CHOICE",
      question: "¿Cuál?",
      options: "not-valid-json",
      correctAnswer: "0",
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex1" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hint).toBeDefined();
    expect(typeof data.hint).toBe("string");
    vi.unstubAllEnvs();
  });
});
