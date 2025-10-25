/**
 * Utility functions สำหรับการจัดการค่าเบี้ยเลี้ยง
 */

// Cache สำหรับเก็บค่าเบี้ยเลี้ยง (แยก cache สำหรับ server และ client)
let serverAllowanceRateCache: number | null = null;
let serverCacheTimestamp: number | null = null;
let clientAllowanceRateCache: number | null = null;
let clientCacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 นาที

/**
 * ล้าง cache ค่าเบี้ยเลี้ยง (ใช้เมื่อมีการอัปเดตค่าใหม่)
 */
export function clearAllowanceCache(): void {
  serverAllowanceRateCache = null;
  serverCacheTimestamp = null;
  clientAllowanceRateCache = null;
  clientCacheTimestamp = null;
}

/**
 * ดึงค่าเบี้ยเลี้ยงปัจจุบันจากฐานข้อมูลโดยตรง (สำหรับ server-side เท่านั้น)
 * @returns Promise<number> ค่าเบี้ยเลี้ยงต่อวัน
 */
export async function getAllowanceRateServer(): Promise<number> {
  // Import prisma เฉพาะเมื่อทำงานใน server environment
  if (typeof window !== 'undefined') {
    throw new Error('getAllowanceRateServer can only be called on the server side');
  }

  try {
    const { default: prisma } = await import('@/lib/prisma');
    
    // ตรวจสอบ cache ก่อน
    if (serverAllowanceRateCache !== null && serverCacheTimestamp !== null) {
      const now = Date.now();
      if (now - serverCacheTimestamp < CACHE_DURATION) {
        return serverAllowanceRateCache;
      }
    }

    // ใช้ raw SQL query แทนเพื่อหลีกเลี่ยงปัญหา model
    const result = await prisma.$queryRaw`
      SELECT value FROM system_settings WHERE setting_key = 'allowance_rate' LIMIT 1
    ` as Array<{ value: string }>;

    if (result && result.length > 0) {
      const rate = parseFloat(result[0].value);
      
      // อัปเดต cache
      serverAllowanceRateCache = rate;
      serverCacheTimestamp = Date.now();
      
      return rate;
    } else {
      console.error('Allowance rate setting not found in database');
      // หากไม่พบการตั้งค่า ให้ใช้ค่าเริ่มต้น
      return 150.00;
    }
  } catch (error) {
    console.error('Error fetching allowance rate from database:', error);
    // หากเกิดข้อผิดพลาด ให้ใช้ค่าเริ่มต้น
    return 150.00;
  }
}

/**
 * ดึงค่าเบี้ยเลี้ยงปัจจุบันจาก API (สำหรับ client-side)
 * @returns Promise<number> ค่าเบี้ยเลี้ยงต่อวัน
 */
export async function getAllowanceRate(): Promise<number> {
  try {
    // ตรวจสอบ cache ก่อน
    if (clientAllowanceRateCache !== null && clientCacheTimestamp !== null) {
      const now = Date.now();
      if (now - clientCacheTimestamp < CACHE_DURATION) {
        return clientAllowanceRateCache;
      }
    }

    // ดึงข้อมูลจาก API
    const response = await fetch('/api/settings/allowance');
    const result = await response.json();

    if (result.success) {
      const rate = parseFloat(result.data.allowanceRate);
      
      // อัปเดต cache
      clientAllowanceRateCache = rate;
      clientCacheTimestamp = Date.now();
      
      return rate;
    } else {
      console.error('Failed to fetch allowance rate:', result.error);
      // หากไม่สามารถดึงข้อมูลได้ ให้ใช้ค่าเริ่มต้น
      return 150.00;
    }
  } catch (error) {
    console.error('Error fetching allowance rate:', error);
    // หากเกิดข้อผิดพลาด ให้ใช้ค่าเริ่มต้น
    return 150.00;
  }
}

/**
 * คำนวณค่าเบี้ยเลี้ยงทั้งหมด
 * @param days จำนวนวัน
 * @param customRate อัตราค่าเบี้ยเลี้ยงที่กำหนดเอง (ถ้าไม่ระบุจะใช้ค่าจากระบบ)
 * @returns Promise<number> ค่าเบี้ยเลี้ยงทั้งหมด
 */
export async function calculateAllowance(days: number, customRate?: number): Promise<number> {
  if (days < 1) return 0;
  
  const rate = customRate ?? await getAllowanceRate();
  return days * rate;
}