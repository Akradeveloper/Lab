import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/testimonials/can-submit/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    progress: { count: vi.fn() },
    testimonial: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/app-config", () => ({
  getAppConfigNumber: vi.fn().mockResolvedValue(5),
  DEFAULT_MIN_LESSONS_TESTIMONIAL: 5,
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("GET /api/testimonials/can-submit", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.progress.count).mockResolvedValue(10);
    vi.mocked(prisma.testimonial.findFirst).mockResolvedValue(null);
  });

  it("devuelve canSubmit: false, reason: no-auth si no hay sesión", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.canSubmit).toBe(false);
    expect(data.reason).toBe("no-auth");
  });

  it("devuelve canSubmit: false, reason: already-submitted si ya envió testimonio", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(prisma.testimonial.findFirst).mockResolvedValue({
      id: "t1",
      approved: false,
    } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.canSubmit).toBe(false);
    expect(data.reason).toBe("already-submitted");
    expect(data.approved).toBe(false);
  });

  it("devuelve canSubmit: false, reason: insufficient-progress si pocas lecciones", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(prisma.progress.count).mockResolvedValue(2);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.canSubmit).toBe(false);
    expect(data.reason).toBe("insufficient-progress");
    expect(data.required).toBe(5);
    expect(data.current).toBe(2);
  });

  it("devuelve canSubmit: true cuando hay sesión, progreso suficiente y no tiene testimonio", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.canSubmit).toBe(true);
  });

  it("L52-55: ejecuta console.error en catch cuando findFirst o count fallan y NODE_ENV no production", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(prisma.progress.count).mockRejectedValueOnce(new Error("DB error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.canSubmit).toBe(false);
      expect(data.reason).toBe("error");
      expect(consoleSpy).toHaveBeenCalledWith("Error comprobando can-submit:", expect.any(Error));
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(prisma.progress.count).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.canSubmit).toBe(false);
      expect(data.reason).toBe("error");
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
