import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/testimonials/submit/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    progress: { count: vi.fn() },
    testimonial: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/app-config", () => ({
  getAppConfigNumber: vi.fn(),
  DEFAULT_MIN_LESSONS_TESTIMONIAL: 5,
  DEFAULT_TESTIMONIAL_MAX_TEXT: 500,
  DEFAULT_TESTIMONIAL_MAX_ROLE_LENGTH: 200,
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { getAppConfigNumber } = await import("@/lib/app-config");

describe("POST /api/testimonials/submit", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(getAppConfigNumber).mockImplementation(async (key: string) => {
      if (key === "testimonial_max_text") return 500;
      if (key === "testimonial_max_role_length") return 200;
      if (key === "min_lessons_testimonial") return 5;
      return 0;
    });
    vi.mocked(prisma.progress.count).mockResolvedValue(10);
    vi.mocked(prisma.testimonial.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.testimonial.create).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Mi testimonio" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 400 si el texto está vacío", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   " }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("obligatorio");
  });

  it("devuelve 403 si no tiene suficientes lecciones completadas", async () => {
    vi.mocked(prisma.progress.count).mockResolvedValue(2);
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Texto válido del testimonio".repeat(5) }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("al menos");
  });

  it("devuelve 409 si ya envió un testimonio", async () => {
    vi.mocked(prisma.testimonial.findFirst).mockResolvedValue({
      id: "t1",
      userId: "u1",
    } as never);
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Otro testimonio válido".repeat(5) }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("Ya has enviado un testimonio.");
  });

  it("devuelve 200 ok: true con texto y roleOrTitle válidos", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Excelente curso, muy recomendable.".repeat(5),
        roleOrTitle: "QA Engineer",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(prisma.testimonial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          text: expect.any(String),
          approved: false,
        }),
      })
    );
  });

  it("L86-89: ejecuta console.error en catch cuando create falla y NODE_ENV no production", async () => {
    vi.mocked(prisma.testimonial.create).mockRejectedValueOnce(new Error("DB error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const req = new Request("https://example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Excelente curso, muy recomendable.".repeat(5),
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("Error al guardar el testimonio");
      expect(consoleSpy).toHaveBeenCalledWith("Error creando testimonio:", expect.any(Error));
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(prisma.testimonial.create).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const req = new Request("https://example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Excelente curso, muy recomendable.".repeat(5),
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
