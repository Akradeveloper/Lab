import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/admin/config/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/app-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/app-config")>();
  return {
    ...actual,
    getConfigValue: vi.fn(),
    getOpenAIModel: vi.fn().mockResolvedValue("gpt-4o-mini"),
    getAppConfigNumber: vi.fn().mockImplementation((key: string) => {
      if (key === "max_prev_content_length") return Promise.resolve(2000);
      if (key === "max_suggest_content_length") return Promise.resolve(2000);
      if (key === "max_prev_title_length") return Promise.resolve(200);
      return Promise.resolve(10);
    }),
  };
});
vi.mock("@/lib/prisma", () => ({
  prisma: { appConfig: { upsert: vi.fn().mockResolvedValue({}) } },
}));
const configOpenaiCreateMock = vi.fn().mockResolvedValue({ choices: [{ message: { content: "ok" } }] });
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: configOpenaiCreateMock } };
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { getConfigValue } = await import("@/lib/app-config");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "admin@b.com", role: "ADMIN" as const, name: "Admin" },
  expires: "",
};

describe("GET /api/admin/config", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(getConfigValue).mockImplementation(async (key: string) => {
      if (key === "openai_model") return "gpt-4o-mini";
      if (key === "achievement_milestones") return [1, 5, 10, 25, 50];
      if (key === "min_lessons_testimonial") return 5;
      if (key === "testimonial_max_text") return 500;
      if (typeof key === "string" && key.length) return 10;
      return "";
    });
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 403 si la sesión no es ADMIN", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("devuelve 200 y objeto de config con sesión ADMIN", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.openai_model).toBe("gpt-4o-mini");
    expect(data.min_lessons_testimonial).toBe(5);
    expect(data.testimonial_max_text).toBe(500);
  });
});

describe("PATCH /api/admin/config", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({ updates: { default_exercise_count: 5 } }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 sin body.updates o no objeto", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("updates");
  });

  it("devuelve 400 si se envía openai_model sin testFirst", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({ updates: { openai_model: "gpt-4o-mini" } }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.needTest).toBe(true);
  });

  it("devuelve 400 si clave no permitida", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({ updates: { invalid_key: 1 } }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Clave no permitida");
  });

  it("devuelve 400 si openai_model no está en lista blanca", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({ updates: { openai_model: "invalid-model" }, testFirst: true }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Modelo no permitido");
  });

  it("devuelve 200 con updates de claves numéricas", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({ updates: { default_exercise_count: 5, min_lessons_testimonial: 3 } }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("devuelve 400 si valor numérico está fuera de rango", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({ updates: { min_lessons_testimonial: 0 } }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/min_lessons_testimonial|entre|1.*50/);
  });

  it("devuelve 400 si achievement_milestones no es array de números", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({ updates: { achievement_milestones: [1, "5", 10] } }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("achievement_milestones");
  });

  it("devuelve 200 con openai_model y testFirst true (mock OpenAI)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    configOpenaiCreateMock.mockResolvedValueOnce({ choices: [{ message: { content: "ok" } }] });
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({
          updates: { openai_model: "gpt-4o-mini" },
          testFirst: true,
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("devuelve 500 cuando upsert falla", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.appConfig.upsert).mockRejectedValueOnce(new Error("DB"));
    const res = await PATCH(
      new Request("https://x.com", {
        method: "PATCH",
        body: JSON.stringify({ updates: { default_exercise_count: 5 } }),
      })
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("configuración");
  });
});
