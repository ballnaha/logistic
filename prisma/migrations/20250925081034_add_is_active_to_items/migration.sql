/*
  Warnings:

  - You are about to drop the `evaluation_criteria` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `items` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE `evaluation_criteria`;
