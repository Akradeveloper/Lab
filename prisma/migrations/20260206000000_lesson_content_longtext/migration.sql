-- AlterTable (MySQL no permite DEFAULT en LONGTEXT; Prisma aplica @default("") en la app)
ALTER TABLE `lesson` MODIFY COLUMN `content` LONGTEXT NOT NULL;