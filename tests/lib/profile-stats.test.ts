import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNextLessonToContinue,
  getProgressByModule,
  buildLessonUrl,
  getProgressTimeSeries,
  getRecentActivityItems,
  getDerivedAchievements,
  type LessonInOrder,
  type ModuleForProfile,
  type ProgressItem,
} from "@/lib/profile-stats";

vi.mock("@/lib/app-config", () => ({
  getAppConfigJson: vi.fn().mockResolvedValue([1, 5, 10, 25, 50]),
  DEFAULT_ACHIEVEMENT_MILESTONES: [1, 5, 10, 25, 50],
}));

describe("profile-stats", () => {
  describe("getNextLessonToContinue", () => {
    it("devuelve la primera lección no completada", () => {
      const progress = [{ courseId: "m1", lessonId: "l1" }];
      const ordered: LessonInOrder[] = [
        { id: "l1", title: "L1", moduleId: "m1", submoduleId: null },
        { id: "l2", title: "L2", moduleId: "m1", submoduleId: null },
      ];
      const result = getNextLessonToContinue(progress, ordered);
      expect(result).toEqual(ordered[1]);
    });

    it("devuelve la primera lección si no hay progreso", () => {
      const ordered: LessonInOrder[] = [
        { id: "l1", title: "L1", moduleId: "m1", submoduleId: null },
      ];
      const result = getNextLessonToContinue([], ordered);
      expect(result).toEqual(ordered[0]);
    });

    it("devuelve null si todas están completadas", () => {
      const progress = [{ courseId: "m1", lessonId: "l1" }];
      const ordered: LessonInOrder[] = [
        { id: "l1", title: "L1", moduleId: "m1", submoduleId: null },
      ];
      const result = getNextLessonToContinue(progress, ordered);
      expect(result).toBeNull();
    });
  });

  describe("getProgressByModule", () => {
    it("calcula completedCount y totalCount por módulo", () => {
      const progress = [
        { courseId: "m1", lessonId: "l1" },
        { courseId: "m1", lessonId: "l2" },
      ];
      const modules: ModuleForProfile[] = [
        {
          id: "m1",
          title: "Mod 1",
          description: null,
          order: 0,
          submodules: [],
          lessons: [{ id: "l1" }, { id: "l2" }, { id: "l3" }],
        },
      ];
      const result = getProgressByModule(progress, modules);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        moduleId: "m1",
        moduleTitle: "Mod 1",
        completedCount: 2,
        totalCount: 3,
      });
    });

    it("cuenta lecciones en submódulos cuando hay submódulos", () => {
      const progress = [{ courseId: "m1", lessonId: "l1" }];
      const modules: ModuleForProfile[] = [
        {
          id: "m1",
          title: "Mod",
          description: null,
          order: 0,
          submodules: [
            { id: "s1", lessons: [{ id: "l1" }, { id: "l2" }] },
          ],
          lessons: [],
        },
      ];
      const result = getProgressByModule(progress, modules);
      expect(result[0].totalCount).toBe(2);
      expect(result[0].completedCount).toBe(1);
    });
  });

  describe("buildLessonUrl", () => {
    it("devuelve ruta con submodulos cuando submoduleId existe", () => {
      const r = buildLessonUrl("m1", "s1", "l1");
      expect(r).toBe("/modulos/m1/submodulos/s1/lecciones/l1");
    });

    it("devuelve ruta sin submodulos cuando submoduleId es null", () => {
      const r = buildLessonUrl("m1", null, "l1");
      expect(r).toBe("/modulos/m1/lecciones/l1");
    });
  });

  describe("getProgressTimeSeries", () => {
    it("agrupa por día por defecto", () => {
      const progress: ProgressItem[] = [
        {
          courseId: "c1",
          lessonId: "l1",
          completedAt: new Date("2025-01-15T10:00:00"),
        },
        {
          courseId: "c1",
          lessonId: "l2",
          completedAt: new Date("2025-01-15T14:00:00"),
        },
      ];
      const result = getProgressTimeSeries(progress);
      expect(result).toHaveLength(1);
      expect(result[0].date).toMatch(/2025-01-15/);
      expect(result[0].count).toBe(2);
    });

    it("respeta lastDays cuando se pasa", () => {
      const progress: ProgressItem[] = [];
      const result = getProgressTimeSeries(progress, {
        groupBy: "day",
        lastDays: 2,
      });
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((p) => typeof p.date === "string" && p.count >= 0)).toBe(
        true
      );
    });
  });

  describe("getRecentActivityItems", () => {
    it("mapea progreso a items con url cuando la lección está en el map", () => {
      const progressSlice = [
        {
          lessonId: "l1",
          completedAt: new Date("2025-01-01"),
        },
      ];
      const lessonMap = new Map([
        [
          "l1",
          {
            id: "l1",
            title: "Lección 1",
            moduleId: "m1",
            submoduleId: "s1",
          },
        ],
      ]);
      const result = getRecentActivityItems(progressSlice, lessonMap);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        lessonId: "l1",
        lessonTitle: "Lección 1",
        url: "/modulos/m1/submodulos/s1/lecciones/l1",
      });
    });

    it("filtra cuando la lección no tiene moduleId", () => {
      const lessonMap = new Map([
        ["l1", { id: "l1", title: "L1", moduleId: null, submoduleId: null }],
      ]);
      const result = getRecentActivityItems(
        [{ lessonId: "l1", completedAt: new Date() }],
        lessonMap
      );
      expect(result).toHaveLength(0);
    });
  });

  describe("getDerivedAchievements", () => {
    it("devuelve logro primera lección cuando hay al menos 1 progreso", async () => {
      const progress: ProgressItem[] = [
        {
          courseId: "m1",
          lessonId: "l1",
          completedAt: new Date("2025-01-01"),
        },
      ];
      const modules: ModuleForProfile[] = [
        {
          id: "m1",
          title: "Mod",
          description: null,
          order: 0,
          submodules: [],
          lessons: [{ id: "l1" }],
        },
      ];
      const result = await getDerivedAchievements(progress, modules);
      expect(result.some((a) => a.id === "primera-leccion")).toBe(true);
      expect(result.some((a) => a.label.includes("Primera lección"))).toBe(
        true
      );
    });

    it("incluye logro de N lecciones cuando se alcanza milestone", async () => {
      const progress: ProgressItem[] = Array.from({ length: 5 }, (_, i) => ({
        courseId: "m1",
        lessonId: `l${i + 1}`,
        completedAt: new Date(`2025-01-${String(i + 1).padStart(2, "0")}`),
      }));
      const modules: ModuleForProfile[] = [
        {
          id: "m1",
          title: "Mod",
          description: null,
          order: 0,
          submodules: [],
          lessons: progress.map((p) => ({ id: p.lessonId })),
        },
      ];
      const result = await getDerivedAchievements(progress, modules);
      expect(result.some((a) => a.id === "lecciones-5")).toBe(true);
    });
  });
});
