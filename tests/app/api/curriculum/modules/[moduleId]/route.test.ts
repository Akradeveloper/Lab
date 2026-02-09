import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/curriculum/modules/[moduleId]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: { findUnique: vi.fn() },
    progress: { findMany: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("GET /api/curriculum/modules/[moduleId]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 400 si falta moduleId", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de módulo requerido");
  });

  it("devuelve 404 si el módulo no existe", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Módulo no encontrado");
  });

  it("devuelve 200 con módulo, submodules, lessons y completed según progress", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "Módulo 1",
      description: "Desc",
      order: 0,
      submodules: [
        {
          id: "s1",
          title: "Sub",
          description: null,
          order: 0,
          lessons: [
            { id: "l1", title: "Lección 1", order: 0 },
            { id: "l2", title: "Lección 2", order: 1 },
          ],
        },
      ],
      lessons: [],
    } as never);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([
      { lessonId: "l1" },
    ] as never);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("m1");
    expect(data.title).toBe("Módulo 1");
    expect(data.submodules).toHaveLength(1);
    expect(data.submodules[0].lessons).toHaveLength(2);
    expect(data.submodules[0].lessons[0].completed).toBe(true);
    expect(data.submodules[0].lessons[1].completed).toBe(false);
    expect(data.completedCount).toBe(1);
    expect(data.totalCount).toBe(2);
  });

  it("devuelve 200 con módulo sin submodules y lessons directas (submodules.length === 0)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(prisma.module.findUnique).mockResolvedValue({
      id: "m1",
      title: "Módulo sin submodules",
      description: null,
      order: 0,
      submodules: [],
      lessons: [
        { id: "l1", title: "Lección directa 1", order: 0 },
        { id: "l2", title: "Lección directa 2", order: 1 },
      ],
    } as never);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([{ lessonId: "l1" }] as never);
    const res = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ moduleId: "m1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("m1");
    expect(data.submodules).toEqual([]);
    expect(data.lessons).toHaveLength(2);
    expect(data.lessons[0].id).toBe("l1");
    expect(data.lessons[0].title).toBe("Lección directa 1");
    expect(data.lessons[0].completed).toBe(true);
    expect(data.lessons[1].completed).toBe(false);
    expect(data.completedCount).toBe(1);
    expect(data.totalCount).toBe(2);
  });
});
