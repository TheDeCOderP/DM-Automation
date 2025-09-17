/*
  Warnings:

  - You are about to drop the column `deleted` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `SocialAccount` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Media` DROP FOREIGN KEY `Media_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `Media` DROP FOREIGN KEY `Media_postId_fkey`;

-- DropForeignKey
ALTER TABLE `Media` DROP FOREIGN KEY `Media_userId_fkey`;

-- DropForeignKey
ALTER TABLE `PageToken` DROP FOREIGN KEY `PageToken_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `Post` DROP FOREIGN KEY `Post_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `Post` DROP FOREIGN KEY `Post_pageTokenId_fkey`;

-- DropForeignKey
ALTER TABLE `Post` DROP FOREIGN KEY `Post_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

-- DropForeignKey
ALTER TABLE `SocialAccount` DROP FOREIGN KEY `SocialAccount_userId_fkey`;

-- DropForeignKey
ALTER TABLE `SocialAccountBrand` DROP FOREIGN KEY `SocialAccountBrand_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `SocialAccountBrand` DROP FOREIGN KEY `SocialAccountBrand_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `UserBrand` DROP FOREIGN KEY `UserBrand_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `UserBrand` DROP FOREIGN KEY `UserBrand_userId_fkey`;

-- DropIndex
DROP INDEX `Media_brandId_fkey` ON `Media`;

-- DropIndex
DROP INDEX `Media_postId_fkey` ON `Media`;

-- DropIndex
DROP INDEX `Media_userId_fkey` ON `Media`;

-- DropIndex
DROP INDEX `Post_brandId_fkey` ON `Post`;

-- DropIndex
DROP INDEX `Post_pageTokenId_fkey` ON `Post`;

-- DropIndex
DROP INDEX `Post_userId_fkey` ON `Post`;

-- DropIndex
DROP INDEX `SocialAccount_userId_idx` ON `SocialAccount`;

-- DropIndex
DROP INDEX `SocialAccountBrand_socialAccountId_fkey` ON `SocialAccountBrand`;

-- AlterTable
ALTER TABLE `Brand` DROP COLUMN `deleted`;

-- AlterTable
ALTER TABLE `SocialAccount` DROP COLUMN `userId`;

-- CreateTable
CREATE TABLE `UserSocialAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserSocialAccount_userId_idx`(`userId`),
    INDEX `UserSocialAccount_socialAccountId_idx`(`socialAccountId`),
    UNIQUE INDEX `UserSocialAccount_userId_socialAccountId_key`(`userId`, `socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBrand` ADD CONSTRAINT `UserBrand_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBrand` ADD CONSTRAINT `UserBrand_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSocialAccount` ADD CONSTRAINT `UserSocialAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSocialAccount` ADD CONSTRAINT `UserSocialAccount_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `SocialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialAccountBrand` ADD CONSTRAINT `SocialAccountBrand_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialAccountBrand` ADD CONSTRAINT `SocialAccountBrand_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `SocialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageToken` ADD CONSTRAINT `PageToken_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `SocialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_pageTokenId_fkey` FOREIGN KEY (`pageTokenId`) REFERENCES `PageToken`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
