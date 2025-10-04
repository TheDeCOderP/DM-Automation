-- CreateTable
CREATE TABLE `BrandInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL DEFAULT 'PCR-0004',
    `status` ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `invitedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `acceptedById` VARCHAR(191) NULL,

    UNIQUE INDEX `BrandInvitation_token_key`(`token`),
    INDEX `BrandInvitation_token_idx`(`token`),
    INDEX `BrandInvitation_email_status_idx`(`email`, `status`),
    INDEX `BrandInvitation_expiresAt_idx`(`expiresAt`),
    INDEX `BrandInvitation_invitedById_idx`(`invitedById`),
    INDEX `BrandInvitation_acceptedById_idx`(`acceptedById`),
    UNIQUE INDEX `BrandInvitation_brandId_email_status_key`(`brandId`, `email`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BrandInvitation` ADD CONSTRAINT `BrandInvitation_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandInvitation` ADD CONSTRAINT `BrandInvitation_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandInvitation` ADD CONSTRAINT `BrandInvitation_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandInvitation` ADD CONSTRAINT `BrandInvitation_acceptedById_fkey` FOREIGN KEY (`acceptedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
