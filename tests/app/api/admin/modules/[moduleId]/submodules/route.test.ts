import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/modules/[moduleId]/submodules/route";

const { submodulesOpenaiCreateMock } = vi.hoisted(() => ({
  submodulesOpenaiCreateMock: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "**Objetivos**\n- Item.\n\n**Contenido**\nTexto." } }],
  }),
}));
vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: { findUnique: vi.fn() },
    submodule: { findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: submodulesOpenaiCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("GET /api/admin/modules/[moduleId]/submodules", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("devuelve 200 con lista de submódulos", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findMany).mockResolvedValue([
      { id: "s1", moduleId: "m1", title: "Sub 1", description: null, order: 0, createdAt: new Date(), _count: { lessons: 2 } },
    ] as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe("s1");
    expect(data[0].title).toBe("Sub 1");
  });
});

describe("POST /api/admin/modules/[moduleId]/submodules", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.submodule.create).mockResolvedValue({
      id: "s1",
      moduleId: "m1",
      title: "Nuevo",
      description: null,
      order: 0,
      createdAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "inexistente" }) }
    );
    expect(res.status).toBe(404);
  });

  it("devuelve 400 si el módulo tiene lecciones directas", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "M1",
      _count: { lessons: 3 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("lecciones");
  });

  it("devuelve 200 y crea submódulo", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "M1",
      _count: { lessons: 0 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Nuevo submódulo" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBeDefined();
  });

  it("crea submódulo con description null cuando OpenAI falla (L90-91 catch)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "M1",
      _count: { lessons: 0 },
    } as never);
    submodulesOpenaiCreateMock.mockRejectedValueOnce(new Error("OpenAI rate limit"));
    vi.mocked(prisma.submodule.create).mockResolvedValue({
      id: "s1",
      moduleId: "m1",
      title: "Sub",
      description: null,
      order: 0,
      createdAt: new Date(),
    } as never);
    process.env.OPENAI_API_KEY = "sk-test";
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(200);
    expect(prisma.submodule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      })
    );
  });

  it("devuelve 500 cuando prisma.submodule.create rechaza (L108-110)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "M1",
      _count: { lessons: 0 },
    } as never);
    vi.mocked(prisma.submodule.create).mockRejectedValue(new Error("DB error"));
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al crear el submódulo");
  });

  it("catch interno (generar descripción IA) con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "M1",
      _count: { lessons: 0 },
    } as never);
    submodulesOpenaiCreateMock.mockRejectedValueOnce(new Error("API error"));
    vi.mocked(prisma.submodule.create).mockResolvedValue({
      id: "sub1",
      moduleId: "m1",
      title: "Sub",
      description: null,
      order: 0,
    } as never);
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(
        new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
        { params: Promise.resolve({ moduleId: "m1" }) }
      );
      expect(res.status).toBe(200);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch externo (crear submódulo) con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "M1",
      _count: { lessons: 0 },
    } as never);
    vi.mocked(prisma.submodule.create).mockRejectedValue(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(
        new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
        { params: Promise.resolve({ moduleId: "m1" }) }
      );
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
