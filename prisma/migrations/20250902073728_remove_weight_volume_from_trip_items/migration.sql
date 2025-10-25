/*
  Warnings:

  - You are about to drop the column `volume` on the `trip_items` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `trip_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `trip_items` DROP COLUMN `volume`,
    DROP COLUMN `weight`;
