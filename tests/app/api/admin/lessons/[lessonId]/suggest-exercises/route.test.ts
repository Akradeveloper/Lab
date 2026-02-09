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
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
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
        }),
      },
    };
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
});
