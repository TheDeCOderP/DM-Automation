/*
  Warnings:

  - You are about to drop the column `brandId` on the `SocialAccount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[platform,platformUserId]` on the table `SocialAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `SocialAccount` DROP FOREIGN KEY `SocialAccount_brandId_fkey`;

-- DropIndex
DROP INDEX `SocialAccount_brandId_fkey` ON `SocialAccount`;

-- DropIndex
DROP INDEX `SocialAccount_userId_platform_brandId_key` ON `SocialAccount`;

-- AlterTable
ALTER TABLE `Post` ADD COLUMN `url` TEXT NULL,
    MODIFY `content` TEXT NOT NULL,
    MODIFY `platform` ENUM('ALL', 'GOOGLE', 'MEDIUM', 'PINTEREST', 'QUORA', 'REDDIT', 'LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `SocialAccount` DROP COLUMN `brandId`,
    ADD COLUMN `accessTokenSecret` TEXT NULL,
    MODIFY `platform` ENUM('ALL', 'GOOGLE', 'MEDIUM', 'PINTEREST', 'QUORA', 'REDDIT', 'LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM') NOT NULL;

-- CreateTable
CREATE TABLE `SocialAccountBrand` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SocialAccountBrand_brandId_socialAccountId_key`(`brandId`, `socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `SocialAccount_platform_platformUserId_key` ON `SocialAccount`(`platform`, `platformUserId`);

-- AddForeignKey
ALTER TABLE `SocialAccount` ADD CONSTRAINT `SocialAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialAccountBrand` ADD CONSTRAINT `SocialAccountBrand_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialAccountBrand` ADD CONSTRAINT `SocialAccountBrand_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `SocialAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
