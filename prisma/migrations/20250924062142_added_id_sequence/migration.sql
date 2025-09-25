-- AlterTable
ALTER TABLE `User` MODIFY `roleId` VARCHAR(191) NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE `UserBrand` MODIFY `roleId` VARCHAR(191) NOT NULL DEFAULT 'brand_user';

-- CreateTable
CREATE TABLE `IdSequence` (
    `prefix` VARCHAR(191) NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`prefix`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
