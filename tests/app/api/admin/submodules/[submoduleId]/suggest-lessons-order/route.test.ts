import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/submodules/[submoduleId]/suggest-lessons-order/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    submodule: { findUnique: vi.fn() },
    lesson: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));
const openaiCreateMock = vi.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify({ orderedIds: ["l1", "l2"] }) } }],
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

const originalEnv = process.env;

describe("POST /api/admin/submodules/[submoduleId]/suggest-lessons-order", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test" };
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si submoduleId está vacío (L29)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("submódulo");
  });

  it("devuelve 404 si el submódulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
  });

  it("devuelve 200 con orderedIds cuando hay una o menos lecciones", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1", title: "L1", content: "", difficulty: null }] as never);
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orderedIds).toEqual(["l1"]);
  });

  it("devuelve 200 con orderedIds desde IA cuando hay varias lecciones", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { id: "l1", title: "L1", content: "c1", difficulty: "JUNIOR" },
      { id: "l2", title: "L2", content: "c2", difficulty: "MID" },
    ] as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ orderedIds: ["l2", "l1"] }) } }],
    });
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orderedIds).toEqual(["l2", "l1"]);
  });

  it("devuelve 502 cuando la IA no devuelve contenido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { id: "l1", title: "L1", content: "", difficulty: null },
      { id: "l2", title: "L2", content: "", difficulty: null },
    ] as never);
    openaiCreateMock.mockResolvedValueOnce({ choices: [{ message: { content: null } }] });
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("orden");
  });

  it("devuelve 502 cuando orderedIds no coinciden con lecciones", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { id: "l1", title: "L1", content: "", difficulty: null },
      { id: "l2", title: "L2", content: "", difficulty: null },
    ] as never);
    openaiCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ orderedIds: ["wrong1", "wrong2"] }) } }],
    });
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/válido|IA/);
  });

  it("devuelve 500 cuando OpenAI lanza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { id: "l1", title: "L1", content: "", difficulty: null },
      { id: "l2", title: "L2", content: "", difficulty: null },
    ] as never);
    openaiCreateMock.mockRejectedValueOnce(new Error("API error"));
    const res = await POST(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("orden");
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
      { id: "l1", title: "L1", content: "", difficulty: null },
      { id: "l2", title: "L2", content: "", difficulty: null },
    ] as never);
    openaiCreateMock.mockRejectedValueOnce(new Error("API error"));
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

  it("devuelve 503 cuando OPENAI_API_KEY no está configurada", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.resetModules();
    const { POST: POSTHandler } = await import("@/app/api/admin/submodules/[submoduleId]/suggest-lessons-order/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({
      id: "s1",
      title: "Sub",
      description: null,
      module: { title: "M1", description: null },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { id: "l1", title: "L1", content: "", difficulty: null },
      { id: "l2", title: "L2", content: "", difficulty: null },
    ] as never);
    const res = await POSTHandler(new Request("https://x.com"), {
      params: Promise.resolve({ submoduleId: "s1" }),
    });
    vi.unstubAllEnvs();
    expect(res.status).toBe(503);
  });
});
