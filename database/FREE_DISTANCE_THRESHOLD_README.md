# ตั้งค่าระยะทางขั้นต่ำ (Free Distance Threshold)

## ภาพรวม
การตั้งค่านี้กำหนดระยะทางรวมต่อเดือนที่ไม่คิดค่าระยะทาง โดยระบบจะคำนวณค่าระยะทางแบบ **Progressive** ตามระยะทางสะสมในแต่ละเดือน

## การคำนวณ

### สูตร
- **0 ถึง [threshold] กม.** → ไม่คิดค่าระยะทาง (0 บาท)
- **หลัง [threshold] กม.** → คิดค่าระยะทาง = ระยะทางที่เกิน × อัตราค่าระยะทาง (distance_rate)

### ตัวอย่าง
สมมติ:
- `free_distance_threshold` = 1,500 กม.
- `distance_rate` = 1.2 บาท/กม.
- ระยะทางรวมในเดือน = 2,000 กม.

การคำนวณ:
```
ระยะทาง 0-1,500 กม. = 0 บาท (ฟรี)
ระยะทาง 1,501-2,000 กม. = (2,000 - 1,500) × 1.2 = 500 × 1.2 = 600 บาท
รวมค่าระยะทางทั้งหมด = 600 บาท
```

## การใช้งาน

### 1. เพิ่มค่าเริ่มต้นในฐานข้อมูล
รันไฟล์ SQL:
```bash
mysql -u root -p logistic < database/add_free_distance_threshold_setting.sql
```

หรือรันใน MySQL Workbench/phpMyAdmin:
```sql
INSERT INTO system_settings (setting_key, value, description, created_at, updated_at)
VALUES (
  'free_distance_threshold',
  '1500',
  'ระยะทางขั้นต่ำที่ไม่คิดค่าระยะทาง (กม.)',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE value = '1500', updated_at = NOW();
```

### 2. เข้าถึงหน้าตั้งค่า
1. เข้าสู่ระบบด้วยบัญชี **Admin**
2. ไปที่ **ตั้งค่า** (Settings)
3. เลือก **ตั้งค่าระยะทางขั้นต่ำ**
4. ระบุค่าระยะทาง (กม.) เช่น 1500
5. กดบันทึก

## API Endpoints

### GET: ดึงค่าระยะทางขั้นต่ำ
```
GET /api/system-settings/free_distance_threshold
```

Response:
```json
{
  "success": true,
  "data": {
    "value": 1500
  }
}
```

### PUT: อัปเดตค่าระยะทางขั้นต่ำ
```
PUT /api/system-settings/free_distance_threshold
Content-Type: application/json

{
  "value": 1500
}
```

Response:
```json
{
  "success": true,
  "data": {
    "value": 1500
  },
  "message": "บันทึกระยะทางขั้นต่ำเรียบร้อยแล้ว"
}
```

## ผลกระทบต่อระบบ

### รายงานคนขับรถ (`/reports/reports-driver`)
- ระบบจะคำนวณค่าระยะทางใหม่แบบ real-time ทุกครั้งที่โหลดรายงาน
- การเปลี่ยนแปลงค่านี้จะมีผลทันทีต่อการแสดงผลในรายงาน
- **ไม่กระทบข้อมูลในฐานข้อมูล** - ข้อมูลเดิมยังคงเหมือนเดิม

### ข้อมูลที่ได้รับผลกระทบ
- ✅ ค่าระยะทางรวม (calculatedDistanceCost)
- ✅ ค่าใช้จ่ายคนขับ (driverExpenses)  
- ✅ ค่าใช้จ่ายรวม (totalCosts)

### ข้อมูลที่ไม่ได้รับผลกระทบ
- ❌ ระยะทางรายเที่ยว (estimatedDistance, actualDistance)
- ❌ ข้อมูลในตาราง trip_records
- ❌ ค่าเบี้ยเลี้ยง, ค่าพัสดุ, ค่าเที่ยวรถ

## ตัวอย่างการใช้งานจริง

### กรณีที่ 1: บริษัทขนส่งทั่วไป
```
Threshold: 1,000 กม.
เหตุผล: ระยะทางสั้นๆ ในพื้นที่ไม่คิดค่าระยะทาง
```

### กรณีที่ 2: บริษัทขนส่งระยะไกล
```
Threshold: 2,000 กม.
เหตุผล: มีข้อตกลงกับลูกค้าว่าระยะทางฐานไม่คิดเงิน
```

### กรณีที่ 3: ไม่ต้องการระยะทางฟรี
```
Threshold: 0 กม.
ผลลัพธ์: ทุก กม. จะถูกคิดค่าระยะทาง
```

## หมายเหตุ

- ค่า default คือ **1,500 กม.** ถ้ายังไม่ได้ตั้งค่า
- ระบบจะคำนวณแบบ progressive ต่อเดือน (เรียงตามวันที่เดินทาง)
- สามารถเปลี่ยนแปลงค่าได้ตลอดเวลาโดยไม่กระทบข้อมูลเก่า
- รองรับค่าทศนิยม แต่แนะนำให้ใช้เลขจำนวนเต็ม

## ไฟล์ที่เกี่ยวข้อง

### Frontend
- `/src/app/settings/free-distance-threshold/page.tsx` - หน้าตั้งค่า
- `/src/app/reports/reports-driver/page.tsx` - หน้ารายงานที่ใช้ค่านี้

### Backend
- `/src/app/api/system-settings/free_distance_threshold/route.ts` - API

### Database
- `/database/add_free_distance_threshold_setting.sql` - SQL สำหรับเพิ่มค่าเริ่มต้น
- Table: `system_settings` (field: `setting_key` = 'free_distance_threshold')
