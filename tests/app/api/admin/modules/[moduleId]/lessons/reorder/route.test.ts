import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/admin/modules/[moduleId]/lessons/reorder/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: { findUnique: vi.fn() },
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

describe("PATCH /api/admin/modules/[moduleId]/lessons/reorder", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ moduleId: "" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si orderedIds no es array o está vacío", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: [] }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("orderedIds");
  });

  it("devuelve 400 cuando orderedIds incluye un no-string (L25)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1", 2] }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("orderedIds");
  });

  it("devuelve 400 cuando algún id no pertenece al módulo (L43)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1", "l2"] }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/IDs|módulo|existen/);
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ moduleId: "inexistente" }) }
    );
    expect(res.status).toBe(404);
  });

  it("devuelve 400 si el módulo tiene submódulos", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 1 },
    } as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 200 al reordenar", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { id: "l1" },
      { id: "l2" },
    ] as never);
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l2", "l1"] }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("devuelve 500 cuando la transacción rechaza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));
    const res = await PATCH(
      new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Error al aplicar el orden");
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await PATCH(
        new Request("https://x.com", { method: "PATCH", body: JSON.stringify({ orderedIds: ["l1"] }) }),
        { params: Promise.resolve({ moduleId: "m1" }) }
      );
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
