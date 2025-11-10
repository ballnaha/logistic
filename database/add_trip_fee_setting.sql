-- เพิ่มค่าเที่ยวลงในตาราง system_settings
INSERT INTO `system_settings` (`setting_key`, `value`, `description`) 
VALUES ('trip_fee', '30', 'ค่าเที่ยว (บาท)')
ON DUPLICATE KEY UPDATE 
  `value` = '30',
  `description` = 'ค่าเที่ยว (บาท)',
  `updated_at` = CURRENT_TIMESTAMP;

-- ตรวจสอบข้อมูล
SELECT * FROM system_settings WHERE setting_key = 'trip_fee';
