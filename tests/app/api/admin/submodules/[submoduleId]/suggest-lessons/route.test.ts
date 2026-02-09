import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/submodules/[submoduleId]/suggest-lessons/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    submodule: { findUnique: vi.fn() },
    lesson: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));
const subSuggestLessonsCreateMock = vi.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify({ suggestions: ["Lección A"] }) } }],
});
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: subSuggestLessonsCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

const originalEnv = process.env;

describe("GET /api/admin/submodules/[submoduleId]/suggest-lessons", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test" };
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta submoduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el submódulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
  });

  it("devuelve 200 con suggestions", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions).toBeDefined();
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it("devuelve 503 cuando OPENAI_API_KEY no está configurada", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.resetModules();
    const { GET: GETHandler } = await import("@/app/api/admin/submodules/[submoduleId]/suggest-lessons/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    const res = await GETHandler(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    vi.unstubAllEnvs();
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
  });

  it("devuelve 200 con suggestions [] cuando completion no trae content", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    subSuggestLessonsCreateMock.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
  });

  it("devuelve 200 con suggestions [] cuando content no es JSON válido (L84 catch)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    subSuggestLessonsCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json {{{" } }],
    });
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
  });

  it("devuelve 500 cuando OpenAI rechaza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    subSuggestLessonsCreateMock.mockRejectedValueOnce(new Error("API error"));
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
    expect(data.error).toContain("Error al obtener sugerencias");
  });
});
