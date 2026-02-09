import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/testimonials/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    testimonial: { findMany: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("GET /api/admin/testimonials", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.testimonial.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión", async () => {
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

  it("devuelve 200 y lista de testimonios con sesión ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin1", email: "admin@b.com", role: "ADMIN", name: "Admin" },
      expires: "",
    } as never);
    const createdAt = new Date("2025-01-01");
    vi.mocked(prisma.testimonial.findMany).mockResolvedValue([
      {
        id: "t1",
        text: "Texto",
        roleOrTitle: "QA",
        approved: true,
        createdAt,
        user: { id: "u1", name: "Usuario", email: "u@e.com" },
      } as never,
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: "t1",
      text: "Texto",
      roleOrTitle: "QA",
      approved: true,
    });
    expect(data[0].createdAt).toBe(createdAt.toISOString());
    expect(data[0].user).toEqual({ id: "u1", name: "Usuario", email: "u@e.com" });
  });

  it("devuelve 500 cuando findMany lanza", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin1", email: "admin@b.com", role: "ADMIN", name: "Admin" },
      expires: "",
    } as never);
    vi.mocked(prisma.testimonial.findMany).mockRejectedValue(new Error("DB error"));
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("cargar testimonios");
  });

  it("L33: ejecuta console.error en catch cuando findMany falla y NODE_ENV no production", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin1", email: "admin@b.com", role: "ADMIN", name: "Admin" },
      expires: "",
    } as never);
    vi.mocked(prisma.testimonial.findMany).mockRejectedValueOnce(new Error("DB error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET();
      expect(res.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith("Error listando testimonios admin:", expect.any(Error));
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin1", email: "admin@b.com", role: "ADMIN", name: "Admin" },
      expires: "",
    } as never);
    vi.mocked(prisma.testimonial.findMany).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET();
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
