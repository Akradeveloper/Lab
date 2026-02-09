import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/config/test/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/app-config", () => ({ getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini") }));
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue({ choices: [{ message: { content: "OK" } }] }),
}));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
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
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "OK" } }] });
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

  it("usa body.model cuando se envía como string no vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o" })
    );
  });

  it("devuelve 400 cuando OPENAI_API_KEY no está configurada", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    process.env.OPENAI_API_KEY = "";
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("OPENAI_API_KEY no configurada");
  });

  it("devuelve 200 ok: false cuando OpenAI lanza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    mockCreate.mockRejectedValueOnce(new Error("Rate limit"));
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Rate limit");
  });

  it("devuelve 200 ok: false con mensaje Error desconocido cuando OpenAI rechaza con valor no Error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    mockCreate.mockRejectedValueOnce("string error");
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Error desconocido al conectar con OpenAI");
  });
});
