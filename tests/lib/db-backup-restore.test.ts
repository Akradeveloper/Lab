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
  });
});
