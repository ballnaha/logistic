import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cache สำหรับเก็บค่าเที่ยว (เพื่อลดการ query ฐานข้อมูล)
let cachedTripFee: number | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 นาที

/**
 * ดึงค่าเที่ยวจากฐานข้อมูล (พร้อม cache)
 * @returns ค่าเที่ยวในหน่วยบาท (default = 30)
 */
export async function getTripFee(): Promise<number> {
  const now = Date.now();

  // ตรวจสอบ cache
  if (cachedTripFee !== null && cacheTimestamp !== null) {
    if (now - cacheTimestamp < CACHE_DURATION) {
      return cachedTripFee;
    }
  }

  try {
    // ดึงค่าเที่ยวจากฐานข้อมูล
    const settings = await prisma.$queryRaw`
      SELECT value FROM system_settings WHERE setting_key = 'trip_fee' LIMIT 1
    ` as { value: string }[];

    let tripFee = 30; // ค่าเริ่มต้น

    if (settings.length > 0) {
      const parsedValue = parseFloat(settings[0].value);
      if (!isNaN(parsedValue) && parsedValue >= 0) {
        tripFee = parsedValue;
      }
    }

    // เก็บลง cache
    cachedTripFee = tripFee;
    cacheTimestamp = now;

    return tripFee;
  } catch (error) {
    console.error('Error fetching trip fee:', error);
    // คืนค่าเริ่มต้นหากเกิดข้อผิดพลาด
    return 30;
  }
}

/**
 * ล้าง cache ของค่าเที่ยว (เรียกใช้เมื่อมีการอัปเดตค่าเที่ยวใหม่)
 */
export function clearTripFeeCache(): void {
  cachedTripFee = null;
  cacheTimestamp = null;
}
