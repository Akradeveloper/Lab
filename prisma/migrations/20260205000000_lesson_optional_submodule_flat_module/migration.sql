-- Add moduleId to Lesson (nullable)
ALTER TABLE "Lesson"
ADD COLUMN "moduleId" TEXT REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SQLite: recreate Lesson with both moduleId and submoduleId nullable (exactly one set, enforced in app)
PRAGMA foreign_keys = OFF;

CREATE TABLE "Lesson_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT,
    "submoduleId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lesson_new_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lesson_new_submoduleId_fkey" FOREIGN KEY ("submoduleId") REFERENCES "Submodule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    "Lesson_new" (
        "id",
        "moduleId",
        "submoduleId",
        "title",
        "content",
        "order",
        "createdAt"
    )
SELECT "id", NULL, "submoduleId", "title", "content", "order", "createdAt"
FROM "Lesson";

DROP TABLE "Lesson";

ALTER TABLE "Lesson_new" RENAME TO "Lesson";

PRAGMA foreign_keys = ON;