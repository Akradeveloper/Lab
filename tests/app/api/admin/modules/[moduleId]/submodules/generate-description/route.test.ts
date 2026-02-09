import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/modules/[moduleId]/submodules/generate-description/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { module: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));
const subGenDescCreateMock = vi.fn().mockResolvedValue({
  choices: [{ message: { content: "**Objetivos**\n- Objetivo 1\n\n**Contenido**\nTexto." } }],
});
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: subGenDescCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

const originalEnv = process.env;

describe("POST /api/admin/modules/[moduleId]/submodules/generate-description", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test" };
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "" }) }
    );
    expect(res.status).toBe(400);
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

  it("devuelve 200 con description", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "Módulo 1",
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Submódulo" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.description).toBeDefined();
    expect(typeof data.description).toBe("string");
  });

  it("devuelve 503 cuando OPENAI_API_KEY no está configurada", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.resetModules();
    const { POST: POSTHandler } = await import("@/app/api/admin/modules/[moduleId]/submodules/generate-description/route");
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({ id: "m1", title: "M1" } as never);
    const res = await POSTHandler(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    vi.unstubAllEnvs();
    expect(res.status).toBe(503);
  });

  it("devuelve 500 cuando OpenAI rechaza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({ id: "m1", title: "M1" } as never);
    subGenDescCreateMock.mockRejectedValueOnce(new Error("API error"));
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al generar la descripción con IA");
  });

  it("devuelve 502 cuando la IA no devuelve description (L50)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({ id: "m1", title: "M1" } as never);
    subGenDescCreateMock.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("No se pudo generar la descripción");
  });

  it("devuelve 500 cuando OpenAI rechaza (L73 catch)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({ id: "m1", title: "M1" } as never);
    subGenDescCreateMock.mockRejectedValueOnce(new Error("Network error"));
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Sub" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(500);
  });
});
