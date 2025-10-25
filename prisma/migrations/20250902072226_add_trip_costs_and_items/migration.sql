-- AlterTable
ALTER TABLE `trip_records` ADD COLUMN `distance_check_fee` DECIMAL(10, 2) NULL,
    ADD COLUMN `fuel_cost` DECIMAL(10, 2) NULL,
    ADD COLUMN `loading_date` DATETIME(3) NULL,
    ADD COLUMN `repair_cost` DECIMAL(10, 2) NULL,
    ADD COLUMN `toll_fee` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `trip_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trip_record_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unit` VARCHAR(50) NOT NULL,
    `weight` DECIMAL(10, 3) NULL,
    `volume` DECIMAL(10, 3) NULL,
    `remark` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trip_items` ADD CONSTRAINT `trip_items_trip_record_id_fkey` FOREIGN KEY (`trip_record_id`) REFERENCES `trip_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip_items` ADD CONSTRAINT `trip_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
