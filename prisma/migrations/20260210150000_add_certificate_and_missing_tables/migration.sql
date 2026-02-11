-- CreateTable
CREATE TABLE `certificate` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `moduleId` VARCHAR(191) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `certificate_userId_moduleId_key`(`userId`, `moduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `roleOrTitle` VARCHAR(200) NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateEnum (MySQL: use ENUM type inline)
-- CreateTable
CREATE TABLE `project_submission` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'REJECTED', 'APPROVED') NOT NULL DEFAULT 'PENDING',
    `submissionType` ENUM('URL', 'FILE') NOT NULL,
    `url` VARCHAR(2000) NULL,
    `filePath` VARCHAR(500) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,

    UNIQUE INDEX `project_submission_userId_lessonId_key`(`userId`, `lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: add lessonType to lesson (missing in init)
ALTER TABLE `lesson` ADD COLUMN `lessonType` VARCHAR(191) NOT NULL DEFAULT 'standard';

-- AlterTable: add difficulty to exercise (missing in init)
ALTER TABLE `exercise` ADD COLUMN `difficulty` ENUM('APRENDIZ', 'JUNIOR', 'MID', 'SENIOR', 'ESPECIALISTA') NULL;

-- AddForeignKey
ALTER TABLE `certificate` ADD CONSTRAINT `certificate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificate` ADD CONSTRAINT `certificate_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonial` ADD CONSTRAINT `testimonial_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_submission` ADD CONSTRAINT `project_submission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_submission` ADD CONSTRAINT `project_submission_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
