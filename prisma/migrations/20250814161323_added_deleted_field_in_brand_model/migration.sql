-- AlterTable
ALTER TABLE `Brand`
ADD COLUMN `deleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `SocialAccount`
DROP FOREIGN KEY `SocialAccount_userId_fkey`,
DROP INDEX `SocialAccount_userId_platform_key`,
ADD UNIQUE INDEX `SocialAccount_userId_platform_brandId_key` (`userId`, `platform`, `brandId`);
