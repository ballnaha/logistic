/*
  Warnings:

  - You are about to drop the column `distance` on the `trip_records` table. All the data in the column will be lost.
  - Added the required column `estimated_distance` to the `trip_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `trip_records` DROP COLUMN `distance`,
    ADD COLUMN `actual_distance` DECIMAL(10, 2) NULL,
    ADD COLUMN `estimated_distance` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `odometer_after` INTEGER NULL,
    ADD COLUMN `odometer_before` INTEGER NULL;
