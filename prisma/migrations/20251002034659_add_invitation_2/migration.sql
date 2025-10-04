/*
  Warnings:

  - You are about to drop the column `acceptedById` on the `BrandInvitation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `BrandInvitation` DROP FOREIGN KEY `BrandInvitation_acceptedById_fkey`;

-- DropIndex
DROP INDEX `BrandInvitation_acceptedById_idx` ON `BrandInvitation`;

-- AlterTable
ALTER TABLE `BrandInvitation` DROP COLUMN `acceptedById`,
    ADD COLUMN `invitedToId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `BrandInvitation_invitedToId_idx` ON `BrandInvitation`(`invitedToId`);

-- AddForeignKey
ALTER TABLE `BrandInvitation` ADD CONSTRAINT `BrandInvitation_invitedToId_fkey` FOREIGN KEY (`invitedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
