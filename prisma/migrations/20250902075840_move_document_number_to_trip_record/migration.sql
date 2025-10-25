/*
  Warnings:

  - You are about to drop the column `document_number` on the `trip_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `trip_items` DROP COLUMN `document_number`;

-- AlterTable
ALTER TABLE `trip_records` ADD COLUMN `document_number` VARCHAR(100) NULL;
