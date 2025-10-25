-- สำหรับสร้างตาราง system_settings (หากยังไม่มี)
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `value` text,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ใส่ข้อมูลเริ่มต้นสำหรับ distance_rate
INSERT INTO `system_settings` (`setting_key`, `value`, `description`) 
VALUES ('distance_rate', '1.2', 'อัตราการคำนวณค่าระยะทาง (ระยะทางจากระบบ × อัตรานี้)')
ON DUPLICATE KEY UPDATE 
  `value` = VALUES(`value`),
  `description` = VALUES(`description`);

-- ตัวอย่างการตรวจสอบข้อมูล
SELECT * FROM system_settings WHERE setting_key = 'distance_rate';