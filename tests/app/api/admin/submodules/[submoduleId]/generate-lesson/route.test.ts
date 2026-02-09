import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/submodules/[submoduleId]/generate-lesson/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    submodule: { findUnique: vi.fn() },
    lesson: { findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({
  getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini"),
  getAppConfigNumber: vi.fn().mockResolvedValue(2000),
  DEFAULT_MAX_PREV_CONTENT_LENGTH: 2000,
}));
const subGenLessonCreateMock = vi.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify({ title: "Lección generada", content: "# Contenido" }) } }],
});
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: subGenLessonCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

const originalEnv = process.env;

describe("POST /api/admin/submodules/[submoduleId]/generate-lesson", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
    vi.mocked(prisma.lesson.create).mockResolvedValue({
      id: "l1",
      title: "Lección generada",
      content: "# Contenido",
      order: 0,
      submoduleId: "s1",
      moduleId: null,
      lessonType: "standard",
      difficulty: null,
      createdAt: new Date(),
    } as never);
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test" };
  });

  it("devuelve 503 cuando OPENAI_API_KEY no está configurada (L27)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.resetModules();
    const { POST: POSTHandler } = await import("@/app/api/admin/submodules/[submoduleId]/generate-lesson/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POSTHandler(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    vi.unstubAllEnvs();
    expect(res.status).toBe(503);
  });

  it("devuelve 400 si submoduleId está vacío (L38)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ submoduleId: "" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta topic", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el submódulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ submoduleId: "inexistente" }) }
    );
    expect(res.status).toBe(404);
  });

  it("devuelve 200 y crea lección generada", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Testing" }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBeDefined();
    expect(data.content).toBeDefined();
  });

  it("devuelve 500 cuando OpenAI rechaza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    subGenLessonCreateMock.mockRejectedValueOnce(new Error("API error"));
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al generar la lección con IA");
  });

  it("devuelve 500 cuando prisma.lesson.create rechaza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.create).mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al generar la lección con IA");
  });

  it("devuelve 502 cuando la IA no devuelve content (L113)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    subGenLessonCreateMock.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(502);
  });

  it("devuelve 502 cuando la respuesta no es JSON válido (L123 catch)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    subGenLessonCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: "not json" } }],
    });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ topic: "Tema" }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(502);
  });
});
