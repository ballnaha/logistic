import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { clearTripFeeCache } from '@/utils/tripFee';

const prisma = new PrismaClient();

// GET - ดึงข้อมูลค่าเที่ยวปัจจุบัน
export async function GET() {
  try {
    // ตรวจสอบว่ามีการตั้งค่าอยู่หรือไม่ (ใช้ key = 'trip_fee')
    const settings = await prisma.$queryRaw`
      SELECT value FROM system_settings WHERE setting_key = 'trip_fee' LIMIT 1
    ` as { value: string }[];

    if (settings.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          tripFee: parseFloat(settings[0].value),
        }
      });
    } else {
      // หากยังไม่มีการตั้งค่า ให้ใช้ค่าเริ่มต้น 30 บาท
      return NextResponse.json({
        success: true,
        data: {
          tripFee: 30.00,
        }
      });
    }
  } catch (error) {
    console.error('Error fetching trip fee:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถดึงข้อมูลค่าเที่ยวได้' 
      },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตค่าเที่ยว
export async function PUT(request: NextRequest) {
  try {
    const { tripFee } = await request.json();

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!tripFee || isNaN(parseFloat(tripFee)) || parseFloat(tripFee) < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณาระบุค่าเที่ยวที่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

    const fee = parseFloat(tripFee);

    // ตรวจสอบว่ามีการตั้งค่าอยู่หรือไม่
    const existingSettings = await prisma.$queryRaw`
      SELECT id FROM system_settings WHERE setting_key = 'trip_fee' LIMIT 1
    ` as { id: number }[];

    if (existingSettings.length > 0) {
      // อัปเดตค่าที่มีอยู่
      await prisma.$executeRaw`
        UPDATE system_settings 
        SET value = ${fee.toString()}, updated_at = NOW() 
        WHERE setting_key = 'trip_fee'
      `;
    } else {
      // สร้างรายการใหม่
      await prisma.$executeRaw`
        INSERT INTO system_settings (setting_key, value, description, created_at, updated_at) 
        VALUES ('trip_fee', ${fee.toString()}, 'ค่าเที่ยว (บาท)', NOW(), NOW())
      `;
    }

    // ล้าง cache เพื่อให้ระบบดึงค่าใหม่
    clearTripFeeCache();

    return NextResponse.json({
      success: true,
      message: 'อัปเดตค่าเที่ยวเรียบร้อยแล้ว',
      data: {
        tripFee: fee,
      }
    });

  } catch (error) {
    console.error('Error updating trip fee:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถอัปเดตค่าเที่ยวได้' 
      },
      { status: 500 }
    );
  }
}
