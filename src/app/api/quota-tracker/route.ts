import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ตัวแปรเก็บโควต้าสำหรับเดือนปัจจุบัน
interface QuotaUsage {
  month: string; // YYYY-MM
  geocoding_count: number;
  distance_count: number;
  total_count: number;
  quota_limit: number;
  is_quota_exceeded: boolean;
  last_reset_date: Date;
}

// โควต้าสูงสุดที่อนุญาต (ตั้งเป็น 9,500 เพื่อให้มี buffer)
const GOOGLE_MAPS_QUOTA_LIMIT = 9500;
const QUOTA_WARNING_THRESHOLD = 9000; // แจ้งเตือนที่ 9,000

// ฟังก์ชันเช็คและรีเซ็ตโควต้ารายเดือน
async function checkAndResetQuota(): Promise<QuotaUsage> {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  try {
    // หาหรือสร้างข้อมูลโควต้าสำหรับเดือนปัจจุบัน
    let quota = await prisma.$queryRaw`
      SELECT * FROM quota_usage WHERE month = ${currentMonth} LIMIT 1
    ` as any[];

    if (quota.length === 0) {
      // สร้างข้อมูลใหม่สำหรับเดือนใหม่
      await prisma.$executeRaw`
        INSERT INTO quota_usage (month, geocoding_count, distance_count, total_count, quota_limit, is_quota_exceeded, last_reset_date)
        VALUES (${currentMonth}, 0, 0, 0, ${GOOGLE_MAPS_QUOTA_LIMIT}, false, NOW())
        ON DUPLICATE KEY UPDATE
        geocoding_count = 0, distance_count = 0, total_count = 0, is_quota_exceeded = false, last_reset_date = NOW()
      `;
      
      quota = [{
        month: currentMonth,
        geocoding_count: 0,
        distance_count: 0,
        total_count: 0,
        quota_limit: GOOGLE_MAPS_QUOTA_LIMIT,
        is_quota_exceeded: false,
        last_reset_date: new Date()
      }];
    }

    return quota[0];
  } catch (error) {
    // ถ้าไม่มีตาราง quota_usage ให้สร้างและใช้ค่าเริ่มต้น
    console.log('Quota table not found, using in-memory tracking');
    
    return {
      month: currentMonth,
      geocoding_count: 0,
      distance_count: 0,
      total_count: 0,
      quota_limit: GOOGLE_MAPS_QUOTA_LIMIT,
      is_quota_exceeded: false,
      last_reset_date: new Date()
    };
  }
}

// ฟังก์ชันอัปเดตการใช้งาน
async function updateQuotaUsage(type: 'geocoding' | 'distance', count: number = 1): Promise<QuotaUsage> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  try {
    if (type === 'geocoding') {
      await prisma.$executeRaw`
        UPDATE quota_usage 
        SET geocoding_count = geocoding_count + ${count},
            total_count = geocoding_count + distance_count + ${count}
        WHERE month = ${currentMonth}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE quota_usage 
        SET distance_count = distance_count + ${count},
            total_count = geocoding_count + distance_count + ${count}
        WHERE month = ${currentMonth}
      `;
    }

    // ดึงข้อมูลล่าสุดหลังอัปเดต
    const quota = await checkAndResetQuota();
    
    // เช็คว่าเกินโควต้าหรือไม่
    if (quota.total_count >= GOOGLE_MAPS_QUOTA_LIMIT) {
      await prisma.$executeRaw`
        UPDATE quota_usage 
        SET is_quota_exceeded = true
        WHERE month = ${currentMonth}
      `;
      quota.is_quota_exceeded = true;
    }

    return quota;
  } catch (error) {
    // Fallback for in-memory tracking
    const quota = await checkAndResetQuota();
    quota.total_count += count;
    
    if (type === 'geocoding') {
      quota.geocoding_count += count;
    } else {
      quota.distance_count += count;
    }
    
    quota.is_quota_exceeded = quota.total_count >= GOOGLE_MAPS_QUOTA_LIMIT;
    return quota;
  }
}

// GET - ดึงสถานะโควต้าปัจจุบัน
export async function GET(request: NextRequest) {
  try {
    const quota = await checkAndResetQuota();
    
    return NextResponse.json({
      success: true,
      data: {
        month: quota.month,
        usage: {
          geocoding: quota.geocoding_count,
          distance: quota.distance_count,
          total: quota.total_count
        },
        limits: {
          quota_limit: quota.quota_limit,
          warning_threshold: QUOTA_WARNING_THRESHOLD
        },
        status: {
          is_quota_exceeded: quota.is_quota_exceeded,
          is_near_limit: quota.total_count >= QUOTA_WARNING_THRESHOLD,
          remaining: Math.max(0, quota.quota_limit - quota.total_count),
          percentage_used: Math.round((quota.total_count / quota.quota_limit) * 100)
        },
        can_use_google_maps: !quota.is_quota_exceeded
      }
    });
  } catch (error) {
    console.error('Error checking quota:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถตรวจสอบโควต้าได้',
        can_use_google_maps: false // ถ้าเกิดข้อผิดพลาด ให้ใช้ OpenStreetMap แทน
      },
      { status: 500 }
    );
  }
}

// POST - อัปเดตการใช้งาน
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, count = 1 } = body;

    if (!type || !['geocoding', 'distance'].includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ประเภทการใช้งานไม่ถูกต้อง (geocoding หรือ distance เท่านั้น)' 
        },
        { status: 400 }
      );
    }

    const quota = await updateQuotaUsage(type, count);

    return NextResponse.json({
      success: true,
      data: {
        month: quota.month,
        usage: {
          geocoding: quota.geocoding_count,
          distance: quota.distance_count,
          total: quota.total_count
        },
        status: {
          is_quota_exceeded: quota.is_quota_exceeded,
          remaining: Math.max(0, quota.quota_limit - quota.total_count),
          can_use_google_maps: !quota.is_quota_exceeded
        }
      },
      message: quota.is_quota_exceeded 
        ? '⚠️ เกินโควต้า Google Maps แล้ว จะใช้ OpenStreetMap แทน' 
        : `✅ อัปเดตการใช้งาน ${type} สำเร็จ`
    });

  } catch (error) {
    console.error('Error updating quota:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถอัปเดตโควต้าได้' 
      },
      { status: 500 }
    );
  }
}
