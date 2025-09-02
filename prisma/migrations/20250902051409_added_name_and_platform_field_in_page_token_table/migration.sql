/*
  Warnings:

  - Added the required column `name` to the `PageToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PageToken` ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `platform` ENUM('ALL', 'GOOGLE', 'MEDIUM', 'PINTEREST', 'QUORA', 'REDDIT', 'LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM') NOT NULL DEFAULT 'FACEBOOK';
