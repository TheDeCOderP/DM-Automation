/*
  Warnings:

  - You are about to drop the column `caption` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `pageId` on the `Post` table. All the data in the column will be lost.
  - Made the column `brandId` on table `Media` required. This step will fail if there are existing NULL values in that column.
  - Made the column `brandId` on table `Post` required. This step will fail if there are existing NULL values in that column.
  - Made the column `brandId` on table `SocialAccount` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Media` DROP FOREIGN KEY `Media_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `Post` DROP FOREIGN KEY `Post_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `SocialAccount` DROP FOREIGN KEY `SocialAccount_brandId_fkey`;

-- DropIndex
DROP INDEX `Media_brandId_fkey` ON `Media`;

-- DropIndex
DROP INDEX `Post_brandId_fkey` ON `Post`;

-- DropIndex
DROP INDEX `SocialAccount_brandId_fkey` ON `SocialAccount`;

-- AlterTable
ALTER TABLE `Media` MODIFY `brandId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Post` DROP COLUMN `caption`,
    DROP COLUMN `pageId`,
    MODIFY `brandId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `SocialAccount` MODIFY `brandId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `PageToken` (
    `id` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `pageName` VARCHAR(191) NOT NULL,
    `accessToken` LONGTEXT NOT NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,

    INDEX `PageToken_socialAccountId_idx`(`socialAccountId`),
    UNIQUE INDEX `PageToken_pageId_socialAccountId_key`(`pageId`, `socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SocialAccount` ADD CONSTRAINT `SocialAccount_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageToken` ADD CONSTRAINT `PageToken_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `SocialAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
