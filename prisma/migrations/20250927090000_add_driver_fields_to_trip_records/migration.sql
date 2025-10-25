-- AlterTable
ALTER TABLE `trip_records`
ADD COLUMN `driver_type` VARCHAR(10) NULL AFTER `estimated_distance`,
ADD COLUMN `driver_name` VARCHAR(100) NULL AFTER `driver_type`;
