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
});
