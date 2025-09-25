/*
  Warnings:

  - You are about to drop the column `roleId` on the `UserBrand` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `UserBrand` DROP FOREIGN KEY `UserBrand_roleId_fkey`;

-- DropIndex
DROP INDEX `UserBrand_roleId_fkey` ON `UserBrand`;

-- AlterTable
ALTER TABLE `User` MODIFY `roleId` VARCHAR(191) NOT NULL DEFAULT 'PCR-0002';

-- AlterTable
ALTER TABLE `UserBrand` DROP COLUMN `roleId`;
