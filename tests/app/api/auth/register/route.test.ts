import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRegisterRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed"),
  },
}));

const { prisma } = await import("@/lib/prisma");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({} as never);
    vi.stubEnv("TURNSTILE_SECRET_KEY", ""); // sin Turnstile en tests
  });

  it("devuelve 400 si faltan email, contraseña o nombre", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Faltan email, contraseña o nombre");
  });

  it("devuelve 400 por honeypot (website rellenado)", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "Pass1234",
        name: "Test",
        website: "http://spam.com",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Error al registrar");
  });

  it("devuelve 400 si el formato del email no es válido", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "no-email",
        password: "Pass1234",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El formato del email no es válido");
  });

  it("devuelve 400 si la contraseña no cumple requisitos", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "short",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("contraseña");
  });

  it("devuelve 409 si ya existe usuario con ese email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "1",
      email: "a@b.com",
      name: "Existing",
      role: "ALUMNO",
    } as never);
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "Pass1234",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("Ya existe una cuenta con ese email");
  });

  it("devuelve 201 y ok: true con datos válidos", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nuevo@example.com",
        password: "Pass1234",
        name: "Usuario Nuevo",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "nuevo@example.com",
          name: "Usuario Nuevo",
          role: "ALUMNO",
        }),
      })
    );
  });
});
