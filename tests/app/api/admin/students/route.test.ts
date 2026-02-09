import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/students/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("GET /api/admin/students", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await GET();
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("No autorizado");
  });

  it("devuelve 403 si la sesión no es ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "1", email: "a@b.com", role: "ALUMNO", name: "Alumno" },
      expires: "",
    } as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("devuelve 200 y lista de alumnos con sesión ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin1", email: "admin@b.com", role: "ADMIN", name: "Admin" },
      expires: "",
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "u1",
        name: "Alumno Uno",
        email: "alumno1@test.com",
        createdAt: new Date("2025-01-01"),
        progress: [
          {
            id: "p1",
            courseId: "c1",
            lessonId: "l1",
            completedAt: new Date("2025-01-02"),
          },
        ],
      },
    ] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: "u1",
      name: "Alumno Uno",
      email: "alumno1@test.com",
      lessonsCompleted: 1,
    });
    expect(data[0].progress).toHaveLength(1);
    expect(data[0].lastActivity).toBeDefined();
  });
});
