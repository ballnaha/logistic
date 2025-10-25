/*
  Warnings:

  - You are about to drop the `material_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `materials` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `materials` DROP FOREIGN KEY `materials_category_id_fkey`;

-- DropTable
DROP TABLE `material_categories`;

-- DropTable
DROP TABLE `materials`;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cm_code` VARCHAR(50) NOT NULL,
    `cm_name` VARCHAR(255) NOT NULL,
    `cm_address` TEXT NULL,
    `cm_phone` VARCHAR(20) NULL,
    `cm_salesname` VARCHAR(100) NULL,
    `cm_region` VARCHAR(100) NULL,
    `cm_mileage` DECIMAL(10, 2) NULL,
    `cm_remark` TEXT NULL,
    `lat` DECIMAL(10, 8) NULL,
    `long` DECIMAL(11, 8) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    UNIQUE INDEX `customers_cm_code_key`(`cm_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pt_part` VARCHAR(100) NOT NULL,
    `pt_desc1` VARCHAR(255) NOT NULL,
    `pt_desc2` VARCHAR(255) NULL,
    `pt_um` VARCHAR(20) NOT NULL,
    `pt_site` VARCHAR(50) NULL,
    `pt_price` DECIMAL(15, 4) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    UNIQUE INDEX `items_pt_part_key`(`pt_part`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
