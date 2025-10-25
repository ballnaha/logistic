import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { clearDistanceRateCache } from '@/utils/distanceRate';

const prisma = new PrismaClient();

// GET - ดึงข้อมูลค่าอัตราระยะทางปัจจุบัน
export async function GET() {
  try {
    // ตรวจสอบว่ามีการตั้งค่าอยู่หรือไม่ (ใช้ key = 'distance_rate')
    const settings = await prisma.$queryRaw`
      SELECT value FROM system_settings WHERE setting_key = 'distance_rate' LIMIT 1
    ` as { value: string }[];

    if (settings.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          distanceRate: parseFloat(settings[0].value),
        }
      });
    } else {
      // หากยังไม่มีการตั้งค่า ให้ใช้ค่าเริ่มต้น 1.20 บาท/กม.
      return NextResponse.json({
        success: true,
        data: {
          distanceRate: 1.20,
        }
      });
    }
  } catch (error) {
    console.error('Error fetching distance rate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถดึงข้อมูลค่าอัตราระยะทางได้' 
      },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตค่าอัตราระยะทาง
export async function PUT(request: NextRequest) {
  try {
    const { distanceRate } = await request.json();

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!distanceRate || isNaN(parseFloat(distanceRate)) || parseFloat(distanceRate) < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณาระบุค่าอัตราระยะทางที่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

    const rate = parseFloat(distanceRate);

    // ตรวจสอบว่ามีการตั้งค่าอยู่หรือไม่
    const existingSettings = await prisma.$queryRaw`
      SELECT id FROM system_settings WHERE setting_key = 'distance_rate' LIMIT 1
    ` as { id: number }[];

    if (existingSettings.length > 0) {
      // อัปเดตค่าที่มีอยู่
      await prisma.$executeRaw`
        UPDATE system_settings 
        SET value = ${rate.toString()}, updated_at = NOW() 
        WHERE setting_key = 'distance_rate'
      `;
    } else {
      // สร้างรายการใหม่
      await prisma.$executeRaw`
        INSERT INTO system_settings (setting_key, value, description, created_at, updated_at) 
        VALUES ('distance_rate', ${rate.toString()}, 'อัตราค่าใช้จ่ายต่อกิโลเมตร (บาท/กม.)', NOW(), NOW())
      `;
    }

    // ล้าง cache เพื่อให้ระบบดึงค่าใหม่
    clearDistanceRateCache();

    return NextResponse.json({
      success: true,
      message: 'อัปเดตค่าอัตราระยะทางเรียบร้อยแล้ว',
      data: {
        distanceRate: rate,
      }
    });

  } catch (error) {
    console.error('Error updating distance rate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถอัปเดตค่าอัตราระยะทางได้' 
      },
      { status: 500 }
    );
  }
}