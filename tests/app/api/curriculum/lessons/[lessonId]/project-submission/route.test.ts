import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/curriculum/lessons/[lessonId]/project-submission/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: vi.fn() },
    projectSubmission: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/app-config", () => ({
  getAppConfigNumber: vi.fn().mockResolvedValue(72),
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { getAppConfigNumber } = await import("@/lib/app-config");

const session = {
  user: { id: "u1", email: "a@b.com", name: "User", role: "ALUMNO" as const },
  expires: "",
};

describe("GET /api/curriculum/lessons/[lessonId]/project-submission", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta lessonId", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de lección requerido");
  });

  it("devuelve 404 si la lección no existe o no es proyecto", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("proyecto");
  });

  it("devuelve 200 con submission null si no hay entrega", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.submission).toBe(null);
  });

  it("devuelve 200 con entrega cuando existe", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "sub1",
      status: "PENDING",
      submissionType: "URL",
      url: "https://example.com",
      submittedAt: new Date(),
      approvedAt: null,
      rejectedAt: null,
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.submission).toBeDefined();
    expect(data.submission.id).toBe("sub1");
    expect(data.submission.status).toBe("PENDING");
  });

  it("devuelve 200 con submission REJECTED y canRetryAt", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      lessonType: "project",
    } as never);
    const rejectedAt = new Date("2025-01-01T12:00:00Z");
    vi.mocked(prisma.projectSubmission.findUnique).mockResolvedValue({
      id: "sub1",
      status: "REJECTED",
      submissionType: "URL",
      url: null,
      submittedAt: new Date(),
      approvedAt: null,
      rejectedAt,
    } as never);
    vi.mocked(getAppConfigNumber).mockResolvedValue(72);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.submission).toBeDefined();
    expect(data.submission.status).toBe("REJECTED");
    expect(data.submission.rejectedAt).toBe(rejectedAt.toISOString());
    expect(data.submission.canRetryAt).toBeDefined();
    const canRetry = new Date(data.submission.canRetryAt).getTime();
    expect(canRetry).toBe(rejectedAt.getTime() + 72 * 60 * 60 * 1000);
  });

  it("devuelve 500 cuando prisma falla", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockRejectedValue(new Error("DB"));
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("entrega");
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET(new Request("https://x.com"), {
        params: Promise.resolve({ lessonId: "l1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
