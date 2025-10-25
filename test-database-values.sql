-- ทดสอบข้อมูลในฐานข้อมูลเพื่อแน่ใจว่า distance_check_fee มีค่า
SELECT 
  id,
  vehicle_id,
  driver_name,
  estimated_distance,
  distance_check_fee,
  fuel_cost,
  toll_fee,
  repair_cost,
  total_allowance
FROM trip_records 
WHERE distance_check_fee IS NOT NULL 
   OR distance_check_fee > 0
LIMIT 5;

-- ตรวจสอบค่า system_settings
SELECT * FROM system_settings WHERE setting_key = 'distance_rate';