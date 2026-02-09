import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/db/wipe/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), deleteMany: vi.fn().mockResolvedValue(undefined) },
    $transaction: vi.fn(),
    exerciseAttempt: { deleteMany: vi.fn().mockResolvedValue(undefined) },
    lessonCheckAttempt: { deleteMany: vi.fn().mockResolvedValue(undefined) },
    progress: { deleteMany: vi.fn().mockResolvedValue(undefined) },
    exercise: { deleteMany: vi.fn().mockResolvedValue(undefined) },
    lesson: { deleteMany: vi.fn().mockResolvedValue(undefined) },
    submodule: { deleteMany: vi.fn().mockResolvedValue(undefined) },
    module: { deleteMany: vi.fn().mockResolvedValue(undefined) },
  },
}));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");
const bcrypt = (await import("bcryptjs")).default;

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("POST /api/admin/db/wipe", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ passwordHash: "hash" } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando el cuerpo no es JSON válido", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Cuerpo de la petición inválido");
  });

  it("devuelve 400 si falta contraseña", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("contraseña");
  });

  it("devuelve 401 si la contraseña es incorrecta", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Contraseña incorrecta");
  });

  it("devuelve 404 si el usuario no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Usuario no encontrado");
  });

  it("devuelve 500 si $transaction lanza", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("vaciar");
  });

  it("devuelve 500 si $transaction lanza (con NODE_ENV=production no registra en consola)", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const req = new Request("https://x.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "secret" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("vaciar");
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("devuelve 200 y vacía la BD con contraseña correcta", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.$transaction).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma as never)
    );
    const req = new Request("https://x.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Base de datos vaciada correctamente");
  });
});
