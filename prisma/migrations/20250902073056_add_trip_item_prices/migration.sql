-- AlterTable
ALTER TABLE `trip_items` ADD COLUMN `total_price` DECIMAL(15, 2) NULL,
    ADD COLUMN `unit_price` DECIMAL(15, 4) NULL;
