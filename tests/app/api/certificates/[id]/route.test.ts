import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/certificates/[id]/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    certificate: { findUnique: vi.fn() },
  },
}));

const { prisma } = await import("@/lib/prisma");

describe("GET /api/certificates/[id]", () => {
  beforeEach(() => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue(null);
  });

  it("devuelve 400 si falta id", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ id: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de certificado requerido");
  });

  it("devuelve 404 si el certificado no existe", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ id: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Certificado no encontrado");
  });

  it("devuelve 200 con datos del certificado", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      id: "c1",
      userName: "User",
      moduleTitle: "Módulo 1",
      issuedAt: new Date("2025-01-01"),
      user: { name: "User" },
      module: { title: "Módulo 1" },
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("c1");
    expect(data.userName).toBe("User");
    expect(data.moduleTitle).toBe("Módulo 1");
    expect(data.issuedAt).toBeDefined();
  });

  it("devuelve 500 cuando findUnique lanza", async () => {
    vi.mocked(prisma.certificate.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Error al obtener el certificado");
  });

  it("ejecuta console.error del catch cuando findUnique lanza (L43)", async () => {
    vi.mocked(prisma.certificate.findUnique).mockRejectedValue(new Error("DB error"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET(new Request("https://x.com"), {
        params: Promise.resolve({ id: "c1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith("Error al obtener certificado:", expect.any(Error));
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });

  it("catch con NODE_ENV production no llama a console.error", async () => {
    vi.mocked(prisma.certificate.findUnique).mockRejectedValueOnce(new Error("DB"));
    const restoreEnv = vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET(new Request("https://x.com"), {
        params: Promise.resolve({ id: "c1" }),
      });
      expect(res.status).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      typeof restoreEnv === "function" ? restoreEnv() : (restoreEnv as { restore?: () => void }).restore?.();
      consoleSpy.mockRestore();
    }
  });
});
