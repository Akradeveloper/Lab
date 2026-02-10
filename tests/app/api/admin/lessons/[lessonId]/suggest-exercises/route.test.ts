import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/lessons/[lessonId]/suggest-exercises/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({
  getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini"),
  getAppConfigNumber: vi.fn().mockResolvedValue(100),
  DEFAULT_MAX_PREV_TITLE_LENGTH: 100,
  DEFAULT_MAX_SUGGEST_CONTENT_LENGTH: 500,
}));
const suggestExercisesCreateMock = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: JSON.stringify({
          suggestions: [
            { type: "MULTIPLE_CHOICE", description: "Pregunta de opción múltiple" },
          ],
        }),
      },
    },
  ],
});
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: suggestExercisesCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("GET /api/admin/lessons/[lessonId]/suggest-exercises", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta lessonId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("lección");
  });

  it("devuelve 404 si la lección no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Lección no encontrada");
  });

  it("devuelve 200 con suggestions", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
      submoduleId: "s1",
      order: 0,
      submodule: { id: "s1" },
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions).toBeDefined();
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it("devuelve 503 con suggestions [] cuando OPENAI_API_KEY no está configurada", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.resetModules();
    const { GET: GETHandler } = await import("@/app/api/admin/lessons/[lessonId]/suggest-exercises/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GETHandler(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    vi.unstubAllEnvs();
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
    expect(data.error).toContain("OPENAI_API_KEY no configurada");
  });

  it("devuelve 200 con suggestions [] cuando completion no trae content", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
      submoduleId: "s1",
      order: 0,
      submodule: { id: "s1" },
    } as never);
    suggestExercisesCreateMock.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
  });

  it("devuelve 500 con suggestions [] cuando OpenAI rechaza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
      submoduleId: "s1",
      order: 0,
      submodule: { id: "s1" },
    } as never);
    suggestExercisesCreateMock.mockRejectedValueOnce(new Error("API error"));
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
    expect(data.error).toContain("Error al obtener sugerencias");
  });

  it("ejecuta console.error del catch cuando falla después de getOpenAIModel (L121)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
      submoduleId: "s1",
      order: 0,
      submodule: { id: "s1" },
    } as never);
    suggestExercisesCreateMock.mockRejectedValueOnce(new Error("OpenAI API error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET(new Request("https://x.com"), {
        params: Promise.resolve({ lessonId: "l1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith("Error al obtener sugerencias de ejercicios:", expect.any(Error));
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "Contenido",
      submoduleId: "s1",
      order: 0,
      submodule: { id: "s1" },
    } as never);
    suggestExercisesCreateMock.mockRejectedValueOnce(new Error("API error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET(new Request("https://x.com"), {
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
