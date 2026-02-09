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
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ title: "Proyecto", content: "# Instrucciones" }) } }],
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

describe("POST /api/admin/submodules/[submoduleId]/generate-project", () => {
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
});
