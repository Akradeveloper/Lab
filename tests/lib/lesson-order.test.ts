import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrderedLessonIdsInModule,
  getPreviousLessonIdsInModule,
} from "@/lib/lesson-order";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    module: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");

describe("lesson-order", () => {
  beforeEach(() => {
    vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
  });

  describe("getOrderedLessonIdsInModule", () => {
    it("devuelve [] si el módulo no existe", async () => {
      vi.mocked(prisma.module.findUnique).mockResolvedValue(null);
      const result = await getOrderedLessonIdsInModule("no-existe");
      expect(result).toEqual([]);
    });

    it("devuelve IDs por orden de submódulos y luego lessons cuando hay submódulos", async () => {
      vi.mocked(prisma.module.findUnique).mockResolvedValue({
        id: "m1",
        submodules: [
          {
            order: 0,
            lessons: [{ id: "l1" }, { id: "l2" }],
          },
          {
            order: 1,
            lessons: [{ id: "l3" }],
          },
        ],
        lessons: [],
      } as never);
      const result = await getOrderedLessonIdsInModule("m1");
      expect(result).toEqual(["l1", "l2", "l3"]);
    });

    it("devuelve IDs de lessons directas cuando no hay submódulos", async () => {
      vi.mocked(prisma.module.findUnique).mockResolvedValue({
        id: "m1",
        submodules: [],
        lessons: [{ id: "a" }, { id: "b" }],
      } as never);
      const result = await getOrderedLessonIdsInModule("m1");
      expect(result).toEqual(["a", "b"]);
    });
  });

  describe("getPreviousLessonIdsInModule", () => {
    it("devuelve [] si la lección es la primera", async () => {
      vi.mocked(prisma.module.findUnique).mockResolvedValue({
        id: "m1",
        submodules: [],
        lessons: [{ id: "first" }, { id: "second" }],
      } as never);
      const result = await getPreviousLessonIdsInModule("m1", "first");
      expect(result).toEqual([]);
    });

    it("devuelve las lecciones anteriores cuando la lección está en medio", async () => {
      vi.mocked(prisma.module.findUnique).mockResolvedValue({
        id: "m1",
        submodules: [],
        lessons: [{ id: "l1" }, { id: "l2" }, { id: "l3" }],
      } as never);
      const result = await getPreviousLessonIdsInModule("m1", "l3");
      expect(result).toEqual(["l1", "l2"]);
    });

    it("devuelve [] si la lección no está en el módulo (index -1 se trata como index <= 0)", async () => {
      vi.mocked(prisma.module.findUnique).mockResolvedValue({
        id: "m1",
        submodules: [],
        lessons: [{ id: "l1" }, { id: "l2" }],
      } as never);
      const result = await getPreviousLessonIdsInModule("m1", "otra");
      expect(result).toEqual([]);
    });
  });
});
