import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/config/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/app-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/app-config")>();
  return {
    ...actual,
    getConfigValue: vi.fn(),
  };
});

const { getServerSession } = await import("next-auth");
const { getConfigValue } = await import("@/lib/app-config");

describe("GET /api/admin/config", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
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
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "ALUMNO", name: "U" },
      expires: "",
    } as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("devuelve 200 y objeto de config con sesión ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin1", email: "admin@b.com", role: "ADMIN", name: "Admin" },
      expires: "",
    } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.openai_model).toBe("gpt-4o-mini");
    expect(data.min_lessons_testimonial).toBe(5);
    expect(data.testimonial_max_text).toBe(500);
  });
});
