import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/config/test/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({ choices: [{ message: { content: "OK" } }] }),
      },
    };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("POST /api/admin/config/test", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    process.env.OPENAI_API_KEY = "sk-test";
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("devuelve 200 ok: true cuando la conexión OpenAI responde", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
