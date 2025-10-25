/**
 * Utility functions สำหรับการจัดการค่าระยะทาง
 */

// Cache สำหรับเก็บค่าระยะทาง (แยก cache สำหรับ server และ client)
let serverDistanceRateCache: number | null = null;
let serverCacheTimestamp: number | null = null;
let clientDistanceRateCache: number | null = null;
let clientCacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 นาที

/**
 * ล้าง cache ค่าระยะทาง (ใช้เมื่อมีการอัปเดตค่าใหม่)
 */
export function clearDistanceRateCache(): void {
  serverDistanceRateCache = null;
  serverCacheTimestamp = null;
  clientDistanceRateCache = null;
  clientCacheTimestamp = null;
}

/**
 * ดึงค่าระยะทางปัจจุบันจากฐานข้อมูลโดยตรง (สำหรับ server-side เท่านั้น)
 * @returns Promise<number> ค่าระยะทางต่อกิโลเมตร
 */
export async function getDistanceRateServer(): Promise<number> {
  // Import prisma เฉพาะเมื่อทำงานใน server environment
  if (typeof window !== 'undefined') {
    throw new Error('getDistanceRateServer can only be called on the server side');
  }

  try {
    const { default: prisma } = await import('@/lib/prisma');
    
    // ตรวจสอบ cache ก่อน
    if (serverDistanceRateCache !== null && serverCacheTimestamp !== null) {
      const now = Date.now();
      if (now - serverCacheTimestamp < CACHE_DURATION) {
        return serverDistanceRateCache;
      }
    }

    // ใช้ raw SQL query แทนเพื่อหลีกเลี่ยงปัญหา model
    const result = await prisma.$queryRaw`
      SELECT value FROM system_settings WHERE setting_key = 'distance_rate' LIMIT 1
    ` as Array<{ value: string }>;

    if (result && result.length > 0) {
      const rate = parseFloat(result[0].value);
      
      // เก็บใน cache
      serverDistanceRateCache = rate;
      serverCacheTimestamp = Date.now();
      
      return rate;
    } else {
      // หากไม่มีข้อมูลในฐานข้อมูล ให้ใช้ค่าเริ่มต้น
      const defaultRate = 1.2; // 1.2 บาทต่อกิโลเมตร
      
      // เก็บใน cache
      serverDistanceRateCache = defaultRate;
      serverCacheTimestamp = Date.now();
      
      return defaultRate;
    }
  } catch (error) {
    console.error('Error fetching distance rate from database:', error);
    
    // หากเกิดข้อผิดพลาด ให้ใช้ค่าเริ่มต้น
    const defaultRate = 1.2;
    
    // เก็บใน cache
    serverDistanceRateCache = defaultRate;
    serverCacheTimestamp = Date.now();
    
    return defaultRate;
  }
}

/**
 * ดึงค่าระยะทางปัจจุบันผ่าน API (สำหรับ client-side)
 * @returns Promise<number> ค่าระยะทางต่อกิโลเมตร
 */
export async function getDistanceRate(): Promise<number> {
  // หากทำงานใน server environment ให้ใช้ฟังก์ชัน server แทน
  if (typeof window === 'undefined') {
    return getDistanceRateServer();
  }

  try {
    // ตรวจสอบ cache ก่อน
    if (clientDistanceRateCache !== null && clientCacheTimestamp !== null) {
      const now = Date.now();
      if (now - clientCacheTimestamp < CACHE_DURATION) {
        return clientDistanceRateCache;
      }
    }

    const response = await fetch('/api/settings/distance-rate');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && typeof data.data.distanceRate === 'number') {
      const rate = data.data.distanceRate;
      
      // เก็บใน cache
      clientDistanceRateCache = rate;
      clientCacheTimestamp = Date.now();
      
      return rate;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching distance rate:', error);
    
    // หากเกิดข้อผิดพลาด ให้ใช้ค่าเริ่มต้น
    const defaultRate = 1.2;
    
    // เก็บใน cache
    clientDistanceRateCache = defaultRate;
    clientCacheTimestamp = Date.now();
    
    return defaultRate;
  }
}

/**
 * คำนวณค่าระยะทางรวม
 * @param distance ระยะทางเป็นกิโลเมตร
 * @param rate อัตราค่าระยะทางต่อกิโลเมตร (ถ้าไม่ระบุจะดึงจากระบบ)
 * @returns Promise<number> ค่าระยะทางรวม
 */
export async function calculateDistanceCost(distance: number, rate?: number): Promise<number> {
  const distanceRate = rate ?? await getDistanceRate();
  return distance * distanceRate;
}