import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/admin/testimonials/[id]/approve/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    testimonial: { update: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("PATCH /api/admin/testimonials/[id]/approve", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.testimonial.update).mockResolvedValue({} as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const req = new Request("https://example.com", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 400 si falta id en params", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin1", email: "a@b.com", role: "ADMIN", name: "Admin" },
      expires: "",
    } as never);
    const req = new Request("https://example.com", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID requerido");
  });

  it("devuelve 200 ok: true, approved con sesión ADMIN y body approved: true", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin1", email: "a@b.com", role: "ADMIN", name: "Admin" },
      expires: "",
    } as never);
    const req = new Request("https://example.com", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.approved).toBe(true);
    expect(prisma.testimonial.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { approved: true },
    });
  });
});
