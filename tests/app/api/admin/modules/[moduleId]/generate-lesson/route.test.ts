import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/modules/[moduleId]/generate-lesson/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: { findUnique: vi.fn() },
    lesson: { findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({
  getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini"),
  getAppConfigNumber: vi.fn().mockResolvedValue(2000),
  DEFAULT_MAX_PREV_CONTENT_LENGTH: 2000,
}));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ title: "Lección generada", content: "# Contenido" }) } }],
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

const originalEnv = process.env;

describe("POST /api/admin/modules/[moduleId]/generate-lesson", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
    vi.mocked(prisma.lesson.create).mockResolvedValue({
      id: "l1",
      title: "Lección generada",
      content: "# Contenido",
      order: 0,
      moduleId: "m1",
      submoduleId: null,
      lessonType: "standard",
      difficulty: null,
      createdAt: new Date(),
    } as never);
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test" };
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta topic", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("tema");
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ moduleId: "inexistente" }) }
    );
    expect(res.status).toBe(404);
  });

  it("devuelve 400 si el módulo tiene submódulos", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "M1",
      description: null,
      _count: { submodules: 1 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 200 y crea lección generada", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "M1",
      description: null,
      _count: { submodules: 0 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Testing unitario" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBeDefined();
    expect(data.content).toBeDefined();
  });
});
