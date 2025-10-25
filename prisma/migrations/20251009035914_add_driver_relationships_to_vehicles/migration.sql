-- AlterTable
ALTER TABLE `vehicles` ADD COLUMN `backup_driver_id` INTEGER NULL,
    ADD COLUMN `main_driver_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_main_driver_id_fkey` FOREIGN KEY (`main_driver_id`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_backup_driver_id_fkey` FOREIGN KEY (`backup_driver_id`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
