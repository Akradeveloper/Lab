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
const { checkRegisterRateLimit } = await import("@/lib/rate-limit");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({} as never);
    vi.mocked(checkRegisterRateLimit).mockResolvedValue(null);
    vi.stubEnv("TURNSTILE_SECRET_KEY", ""); // sin Turnstile en tests por defecto
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

  it("devuelve 400 cuando email se trima a vacío (L8 isValidEmailFormat length 0)", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "   ",
        password: "Pass1234",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El formato del email no es válido");
  });

  it("devuelve 400 si el email no tiene punto en el dominio (L14 L15 dotIndex)", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@dominiosinpunto",
        password: "Pass1234",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El formato del email no es válido");
  });

  it("devuelve 400 cuando dominio es un solo carácter sin punto (L15)", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@b",
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

  it("devuelve 429 cuando el rate limit devuelve error", async () => {
    vi.mocked(checkRegisterRateLimit).mockResolvedValue("Demasiados intentos. Espera un momento.");
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
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("Demasiados intentos. Espera un momento.");
  });

  it("devuelve 400 cuando Turnstile está activo y no hay token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "sk-test");
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
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Verificación de seguridad incorrecta. Intenta de nuevo.");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  });

  it("devuelve 400 cuando Turnstile está activo y el token es demasiado largo", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "sk-test");
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "Pass1234",
        name: "Test",
        turnstileToken: "x".repeat(2049),
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Verificación de seguridad incorrecta. Intenta de nuevo.");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  });

  it("devuelve 400 cuando Turnstile verify devuelve success: false", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "sk-test");
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "Pass1234",
        name: "Test",
        turnstileToken: "valid-token",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Verificación de seguridad incorrecta. Intenta de nuevo.");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.unstubAllGlobals();
  });

  it("devuelve 400 cuando email, password o name no son string", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: 123,
        password: "Pass1234",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Datos inválidos");
  });

  it("devuelve 400 cuando el email es demasiado largo", async () => {
    const longEmail = "a@" + "x".repeat(252) + ".es";
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: longEmail,
        password: "Pass1234",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El email es demasiado largo");
  });

  it("devuelve 400 cuando el nombre supera 100 caracteres", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "Pass1234",
        name: "A".repeat(101),
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("El nombre no puede superar 100 caracteres");
  });

  it("devuelve 400 cuando la contraseña supera 128 caracteres", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "A".repeat(129),
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("La contraseña no puede superar 128 caracteres");
  });

  it("devuelve 400 cuando la contraseña no tiene mayúscula", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "pass1234",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("La contraseña debe incluir al menos una mayúscula");
  });

  it("devuelve 400 cuando la contraseña no tiene minúscula", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "PASS1234",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("La contraseña debe incluir al menos una minúscula");
  });

  it("devuelve 400 cuando la contraseña no tiene número", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "PasswordOnly",
        name: "Test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("La contraseña debe incluir al menos un número");
  });

  it("devuelve 400 cuando confirmPassword no coincide con password", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@b.com",
        password: "Pass1234",
        name: "Test",
        confirmPassword: "OtherPass123",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Las contraseñas no coinciden");
  });

  it("devuelve 500 cuando prisma.user.create lanza", async () => {
    vi.mocked(prisma.user.create).mockRejectedValue(new Error("DB error"));
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
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al registrar");
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(prisma.user.create).mockRejectedValue(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
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
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      if (typeof restoreEnv === "function") restoreEnv();
      else (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("devuelve 500 cuando el body no es JSON válido", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al registrar");
  });
});
