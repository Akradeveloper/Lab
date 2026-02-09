import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/modules/generate-description/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "**Objetivos**\n- Objetivo 1.\n\n**Contenido**\nDescripción del módulo.",
              },
            },
          ],
        }),
      },
    };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("POST /api/admin/modules/generate-description", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Módulo 1" }) })
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta título", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("título");
  });

  it("devuelve 200 con description", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Introducción a QA" }) })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.description).toBeDefined();
    expect(typeof data.description).toBe("string");
  });
});
