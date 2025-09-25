-- CreateTable
CREATE TABLE `SidebarSettings` (
    `id` VARCHAR(191) NOT NULL,
    `spacingPreset` ENUM('NONE', 'SM', 'MD', 'LG') NOT NULL DEFAULT 'MD',
    `spacingPx` INTEGER NULL,
    `accordionMode` ENUM('NONE', 'SINGLE', 'MULTI') NOT NULL DEFAULT 'SINGLE',
    `defaultOpenGroupIds` JSON NULL,
    `compact` BOOLEAN NOT NULL DEFAULT false,
    `showGroupTitles` BOOLEAN NOT NULL DEFAULT true,
    `iconSize` ENUM('SM', 'MD', 'LG') NOT NULL DEFAULT 'MD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
