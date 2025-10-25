-- CreateTable
CREATE TABLE `evaluations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contractor_name` VARCHAR(255) NOT NULL,
    `vehicle_plate` VARCHAR(100) NOT NULL,
    `site` VARCHAR(50) NOT NULL,
    `driver_cooperation` INTEGER NOT NULL,
    `vehicle_condition` INTEGER NOT NULL,
    `damage_found` BOOLEAN NOT NULL DEFAULT false,
    `damage_value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `damage_score` INTEGER NOT NULL DEFAULT 0,
    `remark` TEXT NULL,
    `evaluated_by` VARCHAR(255) NOT NULL,
    `evaluation_date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
