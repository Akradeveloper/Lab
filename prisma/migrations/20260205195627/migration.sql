-- DropIndex (IF EXISTS para no fallar en BD nueva donde los índices se crean en la migración siguiente)
DROP INDEX IF EXISTS "ExerciseAttempt_userId_exerciseId_idx";

DROP INDEX IF EXISTS "ExerciseAttempt_userId_lessonId_idx";

DROP INDEX IF EXISTS "LessonCheckAttempt_userId_lessonId_idx";