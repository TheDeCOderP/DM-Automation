/*
  Warnings:

  - Made the column `invitedToId` on table `BrandInvitation` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `BrandInvitation` DROP FOREIGN KEY `BrandInvitation_invitedToId_fkey`;

-- AlterTable
ALTER TABLE `BrandInvitation` MODIFY `invitedToId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `BrandInvitation` ADD CONSTRAINT `BrandInvitation_invitedToId_fkey` FOREIGN KEY (`invitedToId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
