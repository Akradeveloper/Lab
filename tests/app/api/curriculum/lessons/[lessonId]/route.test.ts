import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/curriculum/lessons/[lessonId]/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: vi.fn() },
    progress: { findMany: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

const session = {
  user: { id: "u1", email: "a@b.com", name: "User", role: "ALUMNO" as const },
  expires: "",
};

describe("GET /api/curriculum/lessons/[lessonId]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([]);
  });

  it("devuelve 403 si no hay sesión", async () => {
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(403);
  });

  it("devuelve 400 si falta lessonId", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("ID de lección requerido");
  });

  it("devuelve 404 si la lección no existe", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "inexistente" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Lección no encontrada");
  });

  it("devuelve 200 con lección y ejercicios", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección 1",
      content: "# Contenido",
      order: 0,
      module: { id: "m1", title: "M1" },
      submodule: null,
      exercises: [
        { id: "e1", type: "MULTIPLE_CHOICE", question: "P?", options: "[]", order: 0 },
      ],
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Lección 1");
    expect(data.exercises).toBeDefined();
  });

  it("devuelve 200 con exercises.options inválido (parseOptions devuelve [])", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección",
      content: "",
      order: 0,
      module: { id: "m1", title: "M1" },
      submodule: null,
      exercises: [
        { id: "e1", type: "MULTIPLE_CHOICE", question: "P?", options: "not-valid-json", order: 0 },
      ],
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exercises).toHaveLength(1);
    expect(data.exercises[0].options).toEqual([]);
  });

  it("devuelve 200 con lección con submodule (moduleId y submodule en respuesta L53-57)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Lección en submódulo",
      content: "",
      order: 0,
      moduleId: null,
      submoduleId: "s1",
      submodule: { id: "s1", title: "Sub", module: { id: "m1", title: "M1" } },
      module: null,
      lessonType: "standard",
      exercises: [],
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.moduleId).toBe("m1");
    expect(data.submodule).toEqual({ id: "s1", title: "Sub" });
    expect(data.exercises).toEqual([]);
  });

  it("devuelve 200 con lección sin ejercicios (filter solo MULTIPLE_CHOICE/TRUE_FALSE)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
      id: "l1",
      title: "Solo teoría",
      content: "",
      order: 0,
      module: { id: "m1", title: "M1" },
      submodule: null,
      exercises: [
        { id: "e1", type: "CODE", question: "Code", options: "{}", order: 0 },
      ],
    } as never);
    const res = await GET(new Request("https://x.com"), {
      params: Promise.resolve({ lessonId: "l1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exercises).toHaveLength(0);
  });
});
