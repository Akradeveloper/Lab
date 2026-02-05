/**
 * Exportación e importación de backup en formato JSON para MySQL.
 * Usado por la API admin y por los scripts db-backup / db-restore.
 */
import type { PrismaClient } from "@prisma/client";

export const BACKUP_SCHEMA_VERSION = 1;

export type BackupData = {
  schemaVersion: number;
  exportedAt: string;
  data: {
    User: Array<Record<string, unknown>>;
    Module: Array<Record<string, unknown>>;
    Submodule: Array<Record<string, unknown>>;
    Lesson: Array<Record<string, unknown>>;
    Exercise: Array<Record<string, unknown>>;
    Progress: Array<Record<string, unknown>>;
    LessonCheckAttempt: Array<Record<string, unknown>>;
    ExerciseAttempt: Array<Record<string, unknown>>;
  };
};

export async function exportBackupToJson(prisma: PrismaClient): Promise<BackupData> {
  const [users, modules, submodules, lessons, exercises, progress, lessonCheckAttempts, exerciseAttempts] =
    await Promise.all([
      prisma.user.findMany(),
      prisma.module.findMany(),
      prisma.submodule.findMany(),
      prisma.lesson.findMany(),
      prisma.exercise.findMany(),
      prisma.progress.findMany(),
      prisma.lessonCheckAttempt.findMany(),
      prisma.exerciseAttempt.findMany(),
    ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      User: users as Array<Record<string, unknown>>,
      Module: modules as Array<Record<string, unknown>>,
      Submodule: submodules as Array<Record<string, unknown>>,
      Lesson: lessons as Array<Record<string, unknown>>,
      Exercise: exercises as Array<Record<string, unknown>>,
      Progress: progress as Array<Record<string, unknown>>,
      LessonCheckAttempt: lessonCheckAttempts as Array<Record<string, unknown>>,
      ExerciseAttempt: exerciseAttempts as Array<Record<string, unknown>>,
    },
  };
}

function isBackupData(obj: unknown): obj is BackupData {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (o.schemaVersion !== BACKUP_SCHEMA_VERSION || !o.data || typeof o.data !== "object") return false;
  const d = o.data as Record<string, unknown>;
  const keys = ["User", "Module", "Submodule", "Lesson", "Exercise", "Progress", "LessonCheckAttempt", "ExerciseAttempt"];
  return keys.every((k) => Array.isArray(d[k]));
}

export async function restoreFromJson(prisma: PrismaClient, json: unknown): Promise<void> {
  if (!isBackupData(json)) {
    throw new Error("El archivo no tiene el formato de backup esperado (schemaVersion y data con las tablas).");
  }

  const { data } = json;

  await prisma.$transaction(async (tx) => {
    await tx.exerciseAttempt.deleteMany();
    await tx.lessonCheckAttempt.deleteMany();
    await tx.progress.deleteMany();
    await tx.exercise.deleteMany();
    await tx.lesson.deleteMany();
    await tx.submodule.deleteMany();
    await tx.module.deleteMany();
    await tx.user.deleteMany();

    if (data.User.length > 0) {
      await tx.user.createMany({ data: data.User as any });
    }
    if (data.Module.length > 0) {
      await tx.module.createMany({ data: data.Module as any });
    }
    if (data.Submodule.length > 0) {
      await tx.submodule.createMany({ data: data.Submodule as any });
    }
    if (data.Lesson.length > 0) {
      await tx.lesson.createMany({ data: data.Lesson as any });
    }
    if (data.Exercise.length > 0) {
      await tx.exercise.createMany({ data: data.Exercise as any });
    }
    if (data.Progress.length > 0) {
      await tx.progress.createMany({ data: data.Progress as any });
    }
    if (data.LessonCheckAttempt.length > 0) {
      await tx.lessonCheckAttempt.createMany({
        data: data.LessonCheckAttempt as any,
      });
    }
    if (data.ExerciseAttempt.length > 0) {
      await tx.exerciseAttempt.createMany({
        data: data.ExerciseAttempt as any,
      });
    }
  });
}
