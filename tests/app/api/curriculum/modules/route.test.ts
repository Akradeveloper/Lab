import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/curriculum/modules/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: { findMany: vi.fn() },
    progress: { findMany: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("GET /api/curriculum/modules", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.module.findMany).mockResolvedValue([]);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await GET();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 200 y lista de módulos con completedCount y totalCount", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user1", email: "a@b.com", name: "U" },
      expires: "",
    } as never);
    vi.mocked(prisma.module.findMany).mockResolvedValue([
      {
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
      } as never,
    ]);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([
      { courseId: "m1", lessonId: "l1" },
    ] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: "m1",
      title: "Módulo 1",
      completedCount: 1,
      totalCount: 2,
    });
    expect(data[0].submodules[0].lessons).toHaveLength(2);
    expect(data[0].submodules[0].lessons[0].completed).toBe(true);
    expect(data[0].submodules[0].lessons[1].completed).toBe(false);
  });
});
