/*
  Warnings:

  - A unique constraint covering the columns `[pageId]` on the table `PageToken` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Post` ADD COLUMN `pageTokenId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `PageToken_pageId_key` ON `PageToken`(`pageId`);

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_pageTokenId_fkey` FOREIGN KEY (`pageTokenId`) REFERENCES `PageToken`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
