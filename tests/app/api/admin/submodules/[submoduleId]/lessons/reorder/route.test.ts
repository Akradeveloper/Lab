import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/admin/submodules/[submoduleId]/lessons/reorder/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    submodule: { findUnique: vi.fn() },
    lesson: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("PATCH /api/admin/submodules/[submoduleId]/lessons/reorder", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta submoduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ submoduleId: "" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si orderedIds está vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: [] }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el submódulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue(null);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ submoduleId: "inexistente" }) }
    );
    expect(res.status).toBe(404);
  });

  it("devuelve 200 al reordenar", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({ id: "s1" } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }, { id: "l2" }] as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l2", "l1"] }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("devuelve 400 cuando orderedIds incluye un no-string (L25)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1", 2] }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando algún id no pertenece al submódulo (L39)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({ id: "s1" } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1", "l2"] }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 500 cuando $transaction rechaza (L53-54)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({ id: "s1" } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ submoduleId: "s1" }) }
    );
    expect(res.status).toBe(500);
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.submodule.findUnique).mockResolvedValue({ id: "s1" } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await PATCH(
        new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
        { params: Promise.resolve({ submoduleId: "s1" }) }
      );
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
