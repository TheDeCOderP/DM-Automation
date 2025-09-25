/*
  Warnings:

  - You are about to drop the `IdSequence` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `IdSequence`;

-- CreateTable
CREATE TABLE `id_sequences` (
    `prefix` VARCHAR(191) NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `id_sequences_prefix_key`(`prefix`),
    PRIMARY KEY (`prefix`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
