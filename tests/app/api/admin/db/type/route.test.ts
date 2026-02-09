import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/db/type/route";

vi.mock("@/lib/api-auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/database-url", () => ({
  isMySQL: vi.fn(),
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { isMySQL } = await import("@/lib/database-url");

describe("GET /api/admin/db/type", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(isMySQL).mockReturnValue(false);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 200 con database sqlite cuando isMySQL es false", async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" },
      expires: "",
    } as never);
    vi.mocked(isMySQL).mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ database: "sqlite" });
  });

  it("devuelve 200 con database mysql cuando isMySQL es true", async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" },
      expires: "",
    } as never);
    vi.mocked(isMySQL).mockReturnValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ database: "mysql" });
  });
});
