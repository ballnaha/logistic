-- เพิ่มการตั้งค่าระยะทางขั้นต่ำ (Free Distance Threshold) ลงใน system_settings
-- ระยะทาง 0-1,500 กม.แรก ไม่คิดค่าระยะทาง

INSERT INTO system_settings (setting_key, value, description, created_at, updated_at)
VALUES (
  'free_distance_threshold',
  '1500',
  'ระยะทางขั้นต่ำที่ไม่คิดค่าระยะทาง (กม.) - ระยะทาง 0-1,500 กม.แรกไม่คิดเงิน',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  value = VALUES(value),
  description = VALUES(description),
  updated_at = NOW();

-- ตรวจสอบข้อมูล
SELECT * FROM system_settings WHERE setting_key = 'free_distance_threshold';
