/*
  Warnings:

  - You are about to drop the column `plafromUserPageId` on the `SocialAccount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Post` ADD COLUMN `pageId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SocialAccount` DROP COLUMN `plafromUserPageId`,
    ADD COLUMN `platformUserImage` VARCHAR(191) NULL;
