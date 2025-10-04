/*
  Warnings:

  - You are about to drop the column `email` on the `BrandInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `BrandInvitation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `BrandInvitation` DROP FOREIGN KEY `BrandInvitation_invitedById_fkey`;

-- DropForeignKey
ALTER TABLE `BrandInvitation` DROP FOREIGN KEY `BrandInvitation_roleId_fkey`;

-- DropIndex
DROP INDEX `BrandInvitation_invitedById_invitedToId_status_idx` ON `BrandInvitation`;

-- DropIndex
DROP INDEX `BrandInvitation_roleId_fkey` ON `BrandInvitation`;

-- AlterTable
ALTER TABLE `BrandInvitation` DROP COLUMN `email`,
    DROP COLUMN `roleId`;
