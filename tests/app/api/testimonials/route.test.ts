import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/testimonials/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    testimonial: {
      findMany: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");

describe("GET /api/testimonials", () => {
  beforeEach(() => {
    vi.mocked(prisma.testimonial.findMany).mockResolvedValue([]);
  });

  it("devuelve 200 y lista de testimonios aprobados", async () => {
    const createdAt = new Date("2025-01-01");
    vi.mocked(prisma.testimonial.findMany).mockResolvedValue([
      {
        id: "t1",
        userName: "Usuario",
        roleOrTitle: "QA",
        text: "Texto del testimonio",
        createdAt,
        user: { name: "Usuario" },
      } as never,
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: "t1",
      userName: "Usuario",
      roleOrTitle: "QA",
      text: "Texto del testimonio",
    });
    expect(data[0].createdAt).toBe(createdAt.toISOString());
  });

  it("devuelve 500 si prisma lanza", async () => {
    vi.mocked(prisma.testimonial.findMany).mockRejectedValue(
      new Error("DB error")
    );
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al cargar testimonios");
  });

  it("L29: ejecuta console.error en catch cuando findMany falla y NODE_ENV no production", async () => {
    vi.mocked(prisma.testimonial.findMany).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET();
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Error al cargar testimonios");
      expect(consoleSpy).toHaveBeenCalledWith("Error listando testimonios:", expect.any(Error));
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("cuando findMany falla con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(prisma.testimonial.findMany).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET();
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
