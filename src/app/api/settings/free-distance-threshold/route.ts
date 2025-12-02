import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - ดึงข้อมูลค่าระยะทางขั้นต่ำที่ไม่คิดค่าระยะทาง
export async function GET() {
  try {
    // ตรวจสอบว่ามีการตั้งค่าอยู่หรือไม่ (ใช้ key = 'free_distance_threshold')
    const settings = await prisma.$queryRaw`
      SELECT value FROM system_settings WHERE setting_key = 'free_distance_threshold' LIMIT 1
    ` as { value: string }[];

    if (settings.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          freeDistanceThreshold: parseFloat(settings[0].value),
        }
      });
    } else {
      // หากยังไม่มีการตั้งค่า ให้ใช้ค่าเริ่มต้น 1500 กม.
      return NextResponse.json({
        success: true,
        data: {
          freeDistanceThreshold: 1500,
        }
      });
    }
  } catch (error) {
    console.error('Error fetching free distance threshold:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถดึงข้อมูลระยะทางขั้นต่ำได้' 
      },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตค่าระยะทางขั้นต่ำที่ไม่คิดค่าระยะทาง
export async function PUT(request: NextRequest) {
  try {
    const { freeDistanceThreshold } = await request.json();

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!freeDistanceThreshold || isNaN(parseFloat(freeDistanceThreshold)) || parseFloat(freeDistanceThreshold) < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณากรอกค่าระยะทางขั้นต่ำที่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

    const thresholdValue = parseFloat(freeDistanceThreshold).toString();

    // ตรวจสอบว่ามีการตั้งค่าอยู่แล้วหรือไม่
    const existing = await prisma.$queryRaw`
      SELECT id FROM system_settings WHERE setting_key = 'free_distance_threshold' LIMIT 1
    ` as { id: number }[];

    if (existing.length > 0) {
      // อัปเดตค่าเดิม
      await prisma.$executeRaw`
        UPDATE system_settings 
        SET value = ${thresholdValue}, updated_at = NOW()
        WHERE setting_key = 'free_distance_threshold'
      `;
    } else {
      // สร้างใหม่
      await prisma.$executeRaw`
        INSERT INTO system_settings (setting_key, value, created_at, updated_at)
        VALUES ('free_distance_threshold', ${thresholdValue}, NOW(), NOW())
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตระยะทางขั้นต่ำเรียบร้อยแล้ว',
      data: {
        freeDistanceThreshold: parseFloat(thresholdValue),
      }
    });
  } catch (error) {
    console.error('Error updating free distance threshold:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถอัปเดตระยะทางขั้นต่ำได้' 
      },
      { status: 500 }
    );
  }
}
