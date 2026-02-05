-- Create Submodule table
CREATE TABLE "Submodule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submodule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Insert one default submodule per module
INSERT INTO
    "Submodule" (
        "id",
        "moduleId",
        "title",
        "description",
        "order",
        "createdAt"
    )
SELECT 'sm-' || "id", "id", 'General', NULL, 0, datetime('now')
FROM "Module";

-- Add submoduleId to Lesson (nullable first)
ALTER TABLE "Lesson" ADD COLUMN "submoduleId" TEXT;

-- Point each lesson to its module's default submodule
UPDATE "Lesson" SET "submoduleId" = 'sm-' || "moduleId";

-- SQLite: recreate Lesson without moduleId and with submoduleId required
PRAGMA foreign_keys = OFF;

CREATE TABLE "Lesson_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submoduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lesson_new_submoduleId_fkey" FOREIGN KEY ("submoduleId") REFERENCES "Submodule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO
    "Lesson_new" (
        "id",
        "submoduleId",
        "title",
        "content",
        "order",
        "createdAt"
    )
SELECT "id", "submoduleId", "title", "content", "order", "createdAt"
FROM "Lesson";

DROP TABLE "Lesson";

ALTER TABLE "Lesson_new" RENAME TO "Lesson";

PRAGMA foreign_keys = ON;

-- Recreate foreign key from Exercise to Lesson (SQLite may have dropped it)
-- Exercise table already has lessonId; ensure the reference exists (no ALTER in SQLite for FK, table is unchanged)
-- So we're done.