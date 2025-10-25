-- CreateTable
CREATE TABLE `materials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_code` VARCHAR(50) NOT NULL,
    `material_name_th` VARCHAR(200) NOT NULL,
    `material_name_en` VARCHAR(200) NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(20) NULL,
    `price` DECIMAL(10, 2) NULL,
    `cost` DECIMAL(10, 2) NULL,
    `stock_qty` INTEGER NOT NULL DEFAULT 0,
    `min_stock` INTEGER NOT NULL DEFAULT 0,
    `max_stock` INTEGER NOT NULL DEFAULT 0,
    `category_id` INTEGER NULL,
    `source_material_id` INTEGER NULL,
    `source_group_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    UNIQUE INDEX `materials_material_code_key`(`material_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name_th` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `material_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(100) NULL,
    `first_name` VARCHAR(50) NULL,
    `last_name` VARCHAR(50) NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'user',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_login` DATETIME(3) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `car_id` INTEGER NOT NULL AUTO_INCREMENT,
    `license_plate` VARCHAR(20) NULL,
    `car_brand` VARCHAR(250) NOT NULL,
    `car_model` VARCHAR(250) NULL,
    `car_color` VARCHAR(100) NULL,
    `car_weight` DECIMAL(8, 2) NULL,
    `car_fuel_tank` DECIMAL(8, 2) NULL,
    `fuel_consume` DECIMAL(6, 2) NULL,
    `fuel_comsume_mth` DECIMAL(10, 2) NULL,
    `car_type` VARCHAR(100) NOT NULL,
    `car_driver_name` VARCHAR(100) NULL,
    `car_driver_license` VARCHAR(50) NULL,
    `driver_image` VARCHAR(255) NULL,
    `backup_driver_name` VARCHAR(100) NULL,
    `backup_driver_license` VARCHAR(50) NULL,
    `backup_driver_image` VARCHAR(255) NULL,
    `car_remark` TEXT NULL,
    `car_image` VARCHAR(255) NULL,
    `owner_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    PRIMARY KEY (`car_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fuel_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicle_id` INTEGER NOT NULL,
    `fuel_date` DATETIME(3) NOT NULL,
    `fuel_amount` DECIMAL(8, 2) NOT NULL,
    `odometer` INTEGER NULL,
    `remark` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(50) NULL,
    `updated_by` VARCHAR(50) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `material_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`car_id`) ON DELETE CASCADE ON UPDATE CASCADE;
