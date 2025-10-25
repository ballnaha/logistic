-- CreateTable
CREATE TABLE `trip_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicle_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `departure_date` DATETIME(3) NOT NULL,
    `departure_time` VARCHAR(10) NOT NULL,
    `return_date` DATETIME(3) NOT NULL,
    `return_time` VARCHAR(10) NOT NULL,
    `distance` DECIMAL(10, 2) NOT NULL,
    `days` INTEGER NOT NULL,
    `allowance_rate` DECIMAL(8, 2) NOT NULL DEFAULT 150.00,
    `total_allowance` DECIMAL(10, 2) NOT NULL,
    `remark` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trip_records` ADD CONSTRAINT `trip_records_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`car_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip_records` ADD CONSTRAINT `trip_records_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
