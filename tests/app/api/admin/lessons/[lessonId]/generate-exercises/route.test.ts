import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/lessons/[lessonId]/generate-exercises/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: vi.fn() },
    exercise: { count: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({
  getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini"),
  getAppConfigNumber: vi.fn().mockResolvedValue(3),
  DEFAULT_EXERCISE_COUNT: 3,
}));
const openaiCreateMock = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: JSON.stringify({
          exercises: [
            { type: "TRUE_FALSE", question: "¿Es cierto?", correctAnswer: true },
            { type: "MULTIPLE_CHOICE", question: "Elige la correcta", options: ["A", "B", "C"], correctAnswer: 0 },
          ],
        }),
      },
    },
  ],
});
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: openaiCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("POST /api/admin/lessons/[lessonId]/generate-exercises", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.exercise.count).mockResolvedValue(0);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "TRUE_FALSE",
      question: "¿Es cierto?",
      options: "[]",
      correctAnswer: "true",
      order: 0,
      createdAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta lessonId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("lección");
  });

  it("devuelve 404 si la lección no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "inexistente" }) }
    );
    expect(res.status).toBe(404);
  });

  it("devuelve 200 con ejercicios creados", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    vi.mocked(prisma.exercise.create)
      .mockResolvedValueOnce({ id: "ex1", lessonId: "l1", type: "TRUE_FALSE", question: "Q1", options: "[]", correctAnswer: "true", order: 0, createdAt: new Date() } as never)
      .mockResolvedValueOnce({ id: "ex2", lessonId: "l1", type: "MULTIPLE_CHOICE", question: "Q2", options: "[]", correctAnswer: "0", order: 1, createdAt: new Date() } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it("devuelve 200 con body count y types", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "TRUE_FALSE",
      question: "Q",
      options: "[]",
      correctAnswer: "true",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ count: 5, types: ["TRUE_FALSE", "MULTIPLE_CHOICE"] }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("devuelve 502 cuando la IA no devuelve contenido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({ choices: [{ message: { content: null } }] });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("contenido");
  });

  it("devuelve 502 cuando la IA no genera ejercicios válidos", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ exercises: [] }) } }],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válidos|tipos/);
  });

  it("L65: devuelve 502 cuando MULTIPLE_CHOICE tiene options con no-string (options.every false)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [
                { type: "MULTIPLE_CHOICE", question: "Q", options: ["A", 2, "C"], correctAnswer: 0 },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válidos|tipos/);
  });

  it("L86: devuelve 502 cuando TRUE_FALSE tiene correctAnswer no boolean", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [
                { type: "TRUE_FALSE", question: "¿Verdadero?", correctAnswer: 1 },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válidos|tipos/);
  });

  it("L56/isCodeExercise: devuelve 502 cuando CODE tiene template no string", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [
                { type: "CODE", question: "Q", language: "javascript", template: 123, testCases: [{ input: "", expectedOutput: "" }] },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válidos|tipos/);
  });

  it("L65: devuelve 502 cuando CODE tiene testCases con input o expectedOutput no string", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [
                {
                  type: "CODE",
                  question: "Q",
                  language: "javascript",
                  template: "function f() {}",
                  testCases: [{ input: 123, expectedOutput: "1" }],
                },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válidos|tipos/);
  });

  it("devuelve 200 con ejercicio CODE (solution, difficulty, codeLanguage)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    const codeExercise = {
      type: "CODE",
      question: "Implementa una función que devuelva 1",
      language: "javascript",
      template: "function fn() { return 0; }",
      testCases: [{ input: "", expectedOutput: "1" }],
      solution: "function fn() { return 1; }",
      difficulty: "JUNIOR",
    };
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ exercises: [codeExercise] }),
          },
        },
      ],
    });
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "CODE",
      question: codeExercise.question,
      options: "{}",
      correctAnswer: codeExercise.solution,
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://x.com", {
        method: "POST",
        body: JSON.stringify({ codeLanguage: "javascript", codeDifficulty: "JUNIOR" }),
      }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(prisma.exercise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "CODE",
          question: codeExercise.question,
        }),
      })
    );
  });

  it("devuelve 500 cuando OpenAI rechaza por API key", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockRejectedValueOnce(
      new Error("Invalid API key provided")
    );
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/OPENAI_API_KEY|configuración/);
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockRejectedValueOnce(new Error("Network error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(
        new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
        { params: Promise.resolve({ lessonId: "l1" }) }
      );
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("devuelve 502 cuando la respuesta de la IA no es JSON válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json {{{" } }],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("Respuesta de la IA no es JSON válido");
  });

  it("usa defaults cuando body no es JSON válido (L102 catch)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "TRUE_FALSE",
      question: "Q",
      options: "[]",
      correctAnswer: "true",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: "not json", headers: { "Content-Type": "application/json" } }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("devuelve 200 con MULTIPLE_CHOICE con options todos string (L65 isValidGenerated)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [
                { type: "MULTIPLE_CHOICE", question: "Elige una", options: ["Opción A", "Opción B", "Opción C"], correctAnswer: 1 },
              ],
            }),
          },
        },
      ],
    });
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "MULTIPLE_CHOICE",
      question: "Elige una",
      options: '["Opción A","Opción B","Opción C"]',
      correctAnswer: "1",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].type).toBe("MULTIPLE_CHOICE");
  });

  it("devuelve 200 con TRUE_FALSE y correctAnswer boolean (L86)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [
                { type: "TRUE_FALSE", question: "¿Es falso?", correctAnswer: false },
              ],
            }),
          },
        },
      ],
    });
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "TRUE_FALSE",
      question: "¿Es falso?",
      options: '["Verdadero","Falso"]',
      correctAnswer: "false",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].correctAnswer).toBe("false");
  });

  it("devuelve 200 con ejercicio CODE usando ex.difficulty cuando no se envía codeDifficulty", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    const codeExercise = {
      type: "CODE",
      question: "Implementa la función",
      language: "javascript",
      template: "function f() {}",
      testCases: [{ input: "1", expectedOutput: "2" }],
      difficulty: "MID",
    };
    openaiCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ exercises: [codeExercise] }) } }],
    });
    vi.mocked(prisma.exercise.create).mockResolvedValue({
      id: "ex1",
      lessonId: "l1",
      type: "CODE",
      question: codeExercise.question,
      options: "{}",
      correctAnswer: "",
      order: 0,
      createdAt: new Date(),
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(prisma.exercise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "CODE",
          difficulty: "MID",
        }),
      })
    );
  });

  it("usa count y allowedTypes por defecto cuando el body no es JSON válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: "not json", headers: { "Content-Type": "application/json" } }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("devuelve 502 cuando la IA devuelve ejercicio CODE con language no permitido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [
                {
                  type: "CODE",
                  question: "Q",
                  language: "ruby",
                  template: "def f\nend",
                  testCases: [{ input: "1", expectedOutput: "2" }],
                },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ types: ["CODE"] }) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válidos|tipos/);
  });

  it("devuelve 502 cuando TRUE_FALSE tiene correctAnswer no boolean", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [{ type: "TRUE_FALSE", question: "¿Verdadero?", correctAnswer: 1 }],
            }),
          },
        },
      ],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ types: ["TRUE_FALSE"] }) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válidos|tipos/);
  });

  it("devuelve 502 cuando MULTIPLE_CHOICE tiene menos de 2 options", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
    } as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              exercises: [{ type: "MULTIPLE_CHOICE", question: "Q", options: ["A"], correctAnswer: 0 }],
            }),
          },
        },
      ],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ types: ["MULTIPLE_CHOICE"] }) }),
      { params: Promise.resolve({ lessonId: "l1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válidos|tipos/);
  });
});
