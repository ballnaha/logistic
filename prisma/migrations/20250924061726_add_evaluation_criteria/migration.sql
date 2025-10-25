-- CreateTable
CREATE TABLE `evaluation_criteria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `criteria_type` VARCHAR(50) NOT NULL,
    `criteria_name` VARCHAR(255) NOT NULL,
    `score_value` INTEGER NOT NULL,
    `score_label` VARCHAR(255) NOT NULL,
    `score_description` TEXT NULL,
    `min_damage_count` INTEGER NULL,
    `max_damage_count` INTEGER NULL,
    `min_damage_value` DECIMAL(15, 2) NULL,
    `max_damage_value` DECIMAL(15, 2) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
