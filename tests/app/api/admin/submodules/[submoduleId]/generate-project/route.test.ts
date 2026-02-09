import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/submodules/[submoduleId]/generate-project/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    submodule: { findUnique: vi.fn() },
    lesson: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));
const subGenProjectCreateMock = vi.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify({ title: "Proyecto", content: "# Instrucciones" }) } }],
});
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: subGenProjectCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

const originalEnv = process.env;

describe("POST /api/admin/submodules/[submoduleId]/generate-project", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test" };
  });

  it("devuelve 503 cuando OPENAI_API_KEY no está configurada (L24)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.resetModules();
    const { POST: POSTHandler } = await import("@/app/api/admin/submodules/[submoduleId]/generate-project/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POSTHandler(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    vi.unstubAllEnvs();
    expect(res.status).toBe(503);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta submoduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el submódulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
  });

  it("devuelve 400 si no hay lecciones anteriores", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("lecciones anteriores");
  });

  it("devuelve 200 con title y content", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { title: "L1", order: 0, content: "Contenido" },
    ] as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBeDefined();
    expect(data.content).toBeDefined();
  });

  it("devuelve 500 cuando OpenAI rechaza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { title: "L1", order: 0, content: "Contenido" },
    ] as never);
    subGenProjectCreateMock.mockRejectedValueOnce(new Error("API error"));
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al generar el proyecto con IA");
  });

  it("devuelve 502 cuando la IA no devuelve content (L103)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { title: "L1", order: 0, content: "Contenido" },
    ] as never);
    subGenProjectCreateMock.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(502);
  });

  it("devuelve 502 cuando la respuesta no es JSON válido (L113 catch)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { title: "L1", order: 0, content: "Contenido" },
    ] as never);
    subGenProjectCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: "not json" } }],
    });
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(502);
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { title: "L1", order: 0, content: "Contenido" },
    ] as never);
    subGenProjectCreateMock.mockRejectedValueOnce(new Error("API error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(new Request("https://x.com"), {
        params: Promise.resolve({ submoduleId: "s1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
