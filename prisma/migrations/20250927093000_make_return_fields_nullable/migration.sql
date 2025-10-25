-- Alter TripRecord return_date and return_time to be nullable
ALTER TABLE `trip_records`
  MODIFY COLUMN `return_date` DATETIME NULL,
  MODIFY COLUMN `return_time` VARCHAR(10) NULL;
