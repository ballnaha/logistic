/*
  Warnings:

  - You are about to drop the column `cm_region` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `pt_site` on the `items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `customers` DROP COLUMN `cm_region`;

-- AlterTable
ALTER TABLE `items` DROP COLUMN `pt_site`;
