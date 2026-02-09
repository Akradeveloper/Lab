import { describe, it, expect, vi } from "vitest";
import {
  BACKUP_SCHEMA_VERSION,
  exportBackupToJson,
  restoreFromJson,
  type BackupData,
} from "@/lib/db-backup-restore";

describe("db-backup-restore", () => {
  describe("exportBackupToJson", () => {
    it("devuelve objeto con schemaVersion y exportedAt", async () => {
      const prisma = {
        user: { findMany: vi.fn().mockResolvedValue([]) },
        module: { findMany: vi.fn().mockResolvedValue([]) },
        submodule: { findMany: vi.fn().mockResolvedValue([]) },
        lesson: { findMany: vi.fn().mockResolvedValue([]) },
        exercise: { findMany: vi.fn().mockResolvedValue([]) },
        progress: { findMany: vi.fn().mockResolvedValue([]) },
        lessonCheckAttempt: { findMany: vi.fn().mockResolvedValue([]) },
        exerciseAttempt: { findMany: vi.fn().mockResolvedValue([]) },
      };
      const result = await exportBackupToJson(prisma as never);
      expect(result.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
      expect(result.exportedAt).toBeDefined();
      expect(result.data).toMatchObject({
        User: [],
        Module: [],
        Submodule: [],
        Lesson: [],
        Exercise: [],
        Progress: [],
        LessonCheckAttempt: [],
        ExerciseAttempt: [],
      });
    });

    it("incluye datos cuando findMany devuelve registros", async () => {
      const prisma = {
        user: { findMany: vi.fn().mockResolvedValue([{ id: "u1", email: "a@b.com" }]) },
        module: { findMany: vi.fn().mockResolvedValue([]) },
        submodule: { findMany: vi.fn().mockResolvedValue([]) },
        lesson: { findMany: vi.fn().mockResolvedValue([]) },
        exercise: { findMany: vi.fn().mockResolvedValue([]) },
        progress: { findMany: vi.fn().mockResolvedValue([]) },
        lessonCheckAttempt: { findMany: vi.fn().mockResolvedValue([]) },
        exerciseAttempt: { findMany: vi.fn().mockResolvedValue([]) },
      };
      const result = await exportBackupToJson(prisma as never);
      expect(result.data.User).toHaveLength(1);
      expect((result.data.User[0] as { id: string }).id).toBe("u1");
    });
  });

  describe("restoreFromJson", () => {
    it("lanza si el JSON no tiene formato de backup", async () => {
      const prisma = { $transaction: vi.fn() };
      await expect(
        restoreFromJson(prisma as never, null)
      ).rejects.toThrow("formato de backup esperado");
      await expect(
        restoreFromJson(prisma as never, {})
      ).rejects.toThrow("formato de backup esperado");
    });

    it("ejecuta transacción con deleteMany y createMany para datos válidos", async () => {
      const createMany = vi.fn().mockResolvedValue(undefined);
      const deleteMany = vi.fn().mockResolvedValue(undefined);
      const tx = {
        exerciseAttempt: { deleteMany, createMany },
        lessonCheckAttempt: { deleteMany, createMany },
        progress: { deleteMany, createMany },
        exercise: { deleteMany, createMany },
        lesson: { deleteMany, createMany },
        submodule: { deleteMany, createMany },
        module: { deleteMany, createMany },
        user: { deleteMany, createMany },
      };
      const prisma = {
        $transaction: vi.fn((fn: (t: typeof tx) => Promise<void>) => fn(tx)),
      };
      const backup: BackupData = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          User: [{ id: "u1", email: "e@e.com", name: "U", passwordHash: "h", role: "ALUMNO", createdAt: new Date().toISOString() }],
          Module: [],
          Submodule: [],
          Lesson: [],
          Exercise: [],
          Progress: [],
          LessonCheckAttempt: [],
          ExerciseAttempt: [],
        },
      };
      await restoreFromJson(prisma as never, backup);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(deleteMany).toHaveBeenCalled();
      expect(createMany).toHaveBeenCalled();
    });

    it("ejecuta createMany para todas las tablas cuando data tiene arrays no vacíos", async () => {
      const userCreateMany = vi.fn().mockResolvedValue(undefined);
      const moduleCreateMany = vi.fn().mockResolvedValue(undefined);
      const submoduleCreateMany = vi.fn().mockResolvedValue(undefined);
      const lessonCreateMany = vi.fn().mockResolvedValue(undefined);
      const exerciseCreateMany = vi.fn().mockResolvedValue(undefined);
      const progressCreateMany = vi.fn().mockResolvedValue(undefined);
      const lessonCheckCreateMany = vi.fn().mockResolvedValue(undefined);
      const exerciseAttemptCreateMany = vi.fn().mockResolvedValue(undefined);
      const tx = {
        exerciseAttempt: { deleteMany: vi.fn().mockResolvedValue(undefined), createMany: exerciseAttemptCreateMany },
        lessonCheckAttempt: { deleteMany: vi.fn().mockResolvedValue(undefined), createMany: lessonCheckCreateMany },
        progress: { deleteMany: vi.fn().mockResolvedValue(undefined), createMany: progressCreateMany },
        exercise: { deleteMany: vi.fn().mockResolvedValue(undefined), createMany: exerciseCreateMany },
        lesson: { deleteMany: vi.fn().mockResolvedValue(undefined), createMany: lessonCreateMany },
        submodule: { deleteMany: vi.fn().mockResolvedValue(undefined), createMany: submoduleCreateMany },
        module: { deleteMany: vi.fn().mockResolvedValue(undefined), createMany: moduleCreateMany },
        user: { deleteMany: vi.fn().mockResolvedValue(undefined), createMany: userCreateMany },
      };
      const prisma = {
        $transaction: vi.fn((fn: (t: typeof tx) => Promise<void>) => fn(tx)),
      };
      const backup: BackupData = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          User: [{ id: "u1", email: "e@e.com", name: "U", passwordHash: "h", role: "ALUMNO", createdAt: new Date().toISOString() }],
          Module: [{ id: "m1", title: "M", description: null, order: 0, createdAt: new Date().toISOString() }],
          Submodule: [{ id: "s1", moduleId: "m1", title: "S", description: null, order: 0, createdAt: new Date().toISOString() }],
          Lesson: [{ id: "l1", title: "L", content: "C", order: 0, moduleId: "m1", submoduleId: null }],
          Exercise: [{ id: "ex1", lessonId: "l1", type: "TRUE_FALSE", question: "Q", correctAnswer: "true", order: 0 }],
          Progress: [{ id: "p1", userId: "u1", courseId: "m1", lessonId: "l1", completedAt: new Date().toISOString() }],
          LessonCheckAttempt: [{ id: "lc1", userId: "u1", lessonId: "l1", allCorrect: true }],
          ExerciseAttempt: [{ id: "ea1", userId: "u1", exerciseId: "ex1", lessonId: "l1", correct: true }],
        },
      };
      await restoreFromJson(prisma as never, backup);
      expect(userCreateMany).toHaveBeenCalled();
      expect(moduleCreateMany).toHaveBeenCalled();
      expect(submoduleCreateMany).toHaveBeenCalled();
      expect(lessonCreateMany).toHaveBeenCalled();
      expect(exerciseCreateMany).toHaveBeenCalled();
      expect(progressCreateMany).toHaveBeenCalled();
      expect(lessonCheckCreateMany).toHaveBeenCalled();
      expect(exerciseAttemptCreateMany).toHaveBeenCalled();
    });
  });
});
