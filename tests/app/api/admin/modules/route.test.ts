import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/modules/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/app-config", () => ({
  getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini"),
}));
const modulesOpenaiCreateMock = vi.fn().mockResolvedValue({
  choices: [{ message: { content: "**Objetivos**\n- Objetivo 1\n\n**Contenido**\nTexto generado." } }],
});
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: modulesOpenaiCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("GET /api/admin/modules", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("devuelve 200 con lista de módulos", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findMany).mockResolvedValue([
      {
        id: "m1",
        title: "M1",
        description: null,
        order: 0,
        createdAt: new Date(),
        submodules: [{ _count: { lessons: 2 } }],
        _count: { lessons: 1 },
      },
    ] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].title).toBe("M1");
    expect(data[0].lessonsCount).toBe(3);
  });
});

describe("POST /api/admin/modules", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.create).mockResolvedValue({
      id: "m1",
      title: "Nuevo",
      description: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nuevo" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si el título está vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El título es obligatorio");
  });

  it("devuelve 200 con módulo creado", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nuevo módulo" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Nuevo");
  });

  it("devuelve 500 cuando prisma.module.create lanza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.create).mockRejectedValue(new Error("DB error"));
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nuevo módulo" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al crear el módulo");
  });

  it("genera descripción con OpenAI cuando no se envía description y hay API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.resetModules();
    const { POST: POSTHandler } = await import("@/app/api/admin/modules/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.create).mockResolvedValue({
      id: "m1",
      title: "Módulo IA",
      description: "**Objetivos**\n- Objetivo 1",
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Módulo IA" }),
    });
    const res = await POSTHandler(req);
    vi.unstubAllEnvs();
    expect(res.status).toBe(200);
    expect(modulesOpenaiCreateMock).toHaveBeenCalled();
    expect(prisma.module.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Módulo IA",
          description: expect.any(String),
        }),
      })
    );
  });

  it("crea módulo con description null cuando OpenAI falla (catch del try)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.resetModules();
    const { POST: POSTHandler } = await import("@/app/api/admin/modules/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    modulesOpenaiCreateMock.mockRejectedValueOnce(new Error("OpenAI rate limit"));
    vi.mocked(prisma.module.create).mockResolvedValue({
      id: "m1",
      title: "Módulo sin IA",
      description: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Módulo sin IA" }),
    });
    const res = await POSTHandler(req);
    vi.unstubAllEnvs();
    modulesOpenaiCreateMock.mockResolvedValue({
      choices: [{ message: { content: "**Objetivos**\n- Objetivo 1\n\n**Contenido**\nTexto." } }],
    });
    expect(res.status).toBe(200);
    expect(prisma.module.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Módulo sin IA",
          description: null,
        }),
      })
    );
  });

  it("ejecuta console.error del catch cuando OpenAI falla (L78-79)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const restoreNodeEnv = vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { POST: POSTHandler } = await import("@/app/api/admin/modules/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    modulesOpenaiCreateMock.mockRejectedValueOnce(new Error("OpenAI rate limit"));
    vi.mocked(prisma.module.create).mockResolvedValue({
      id: "m1",
      title: "Módulo",
      description: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const req = new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Módulo" }),
      });
      await POSTHandler(req);
      expect(consoleSpy).toHaveBeenCalledWith("Error al generar descripción del módulo con IA:", expect.any(Error));
    } finally {
      vi.unstubAllEnvs();
      if (typeof restoreNodeEnv === "function") restoreNodeEnv();
      else (restoreNodeEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch OpenAI con NODE_ENV production no llama a console.error", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const restoreNodeEnv = vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { POST: POSTHandler } = await import("@/app/api/admin/modules/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    modulesOpenaiCreateMock.mockRejectedValueOnce(new Error("OpenAI rate limit"));
    vi.mocked(prisma.module.create).mockResolvedValue({
      id: "m1",
      title: "Módulo",
      description: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const req = new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Módulo" }),
      });
      const res = await POSTHandler(req);
      expect(res.status).toBe(200);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      if (typeof restoreNodeEnv === "function") restoreNodeEnv();
      else (restoreNodeEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("ejecuta console.error del catch externo cuando create falla (L94-95)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.create).mockRejectedValueOnce(new Error("DB error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const req = new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nuevo" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith("Error al crear módulo:", expect.any(Error));
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch externo con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.create).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const req = new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nuevo" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
