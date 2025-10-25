/*
  Warnings:

  - You are about to drop the column `backup_driver_image` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `backup_driver_license` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `backup_driver_name` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `car_driver_license` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `car_driver_name` on the `vehicles` table. All the data in the column will be lost.
  - You are about to drop the column `driver_image` on the `vehicles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `fuel_records` ADD COLUMN `driver_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `trip_records` ADD COLUMN `driver_id` INTEGER NULL,
    MODIFY `return_date` DATETIME(3) NULL,
    ALTER COLUMN `allowance_rate` DROP DEFAULT;

-- AlterTable
ALTER TABLE `vehicles` DROP COLUMN `backup_driver_image`,
    DROP COLUMN `backup_driver_license`,
    DROP COLUMN `backup_driver_name`,
    DROP COLUMN `car_driver_license`,
    DROP COLUMN `car_driver_name`,
    DROP COLUMN `driver_image`;

-- CreateTable
CREATE TABLE `drivers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `driver_name` VARCHAR(100) NOT NULL,
    `driver_license` VARCHAR(50) NOT NULL,
    `driver_image` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `remark` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    UNIQUE INDEX `drivers_driver_license_key`(`driver_license`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_setting_key_key`(`setting_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip_records` ADD CONSTRAINT `trip_records_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
