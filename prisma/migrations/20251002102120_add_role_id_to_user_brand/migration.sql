/*
  Warnings:

  - You are about to drop the column `role` on the `UserBrand` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `UserBrand` DROP COLUMN `role`,
    ADD COLUMN `roleId` VARCHAR(191) NOT NULL DEFAULT 'PCR-0003';

-- CreateIndex
CREATE INDEX `BrandInvitation_brandId_invitedToId_status_idx` ON `BrandInvitation`(`brandId`, `invitedToId`, `status`);

-- AddForeignKey
ALTER TABLE `UserBrand` ADD CONSTRAINT `UserBrand_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandInvitation` ADD CONSTRAINT `BrandInvitation_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
