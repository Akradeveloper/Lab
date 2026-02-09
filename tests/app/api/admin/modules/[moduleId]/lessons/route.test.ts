import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/modules/[moduleId]/lessons/route";

vi.mock("@/lib/api-auth", () => ({ getAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: { findUnique: vi.fn() },
    lesson: { findMany: vi.fn(), create: vi.fn() },
  },
}));

const { getAdminSession } = await import("@/lib/api-auth");
const { prisma } = await import("@/lib/prisma");

const adminSession = {
  user: { id: "admin1", email: "a@b.com", name: "Admin", role: "ADMIN" as const },
  expires: "",
};

describe("GET /api/admin/modules/[moduleId]/lessons", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Módulo no encontrado");
  });

  it("devuelve 400 si el módulo tiene submódulos", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 2 },
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("submódulos");
  });

  it("devuelve 200 con lista de lecciones", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    vi.mocked(prisma.lesson.findMany).mockResolvedValue([
      { id: "l1", title: "Lección 1", content: "", order: 0, moduleId: "m1", submoduleId: null, difficulty: null, lessonType: "standard", createdAt: new Date(), _count: { exercises: 2 } },
    ] as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe("l1");
    expect(data[0].title).toBe("Lección 1");
  });
});

describe("POST /api/admin/modules/[moduleId]/lessons", () => {
  beforeEach(() => {
    vi.mocked(getAdminSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.lesson.create).mockResolvedValue({
      id: "l1",
      title: "Nueva",
      content: "",
      order: 0,
      moduleId: "m1",
      submoduleId: null,
      lessonType: "standard",
      difficulty: null,
      createdAt: new Date(),
    } as never);
  });

  it("devuelve 403 si no hay sesión admin", async () => {
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Título" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Título" }) }),
      { params: Promise.resolve({ moduleId: "" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Título" }) }),
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
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Título" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si falta título", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("título");
  });

  it("devuelve 200 y crea lección", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      _count: { submodules: 0 },
    } as never);
    const res = await POST(
      new Request("https://x.com", { method: "POST", body: JSON.stringify({ title: "Nueva lección" }) }),
      { params: Promise.resolve({ moduleId: "m1" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBeDefined();
  });
});
