import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { clearAllowanceCache } from '@/utils/allowance';

const prisma = new PrismaClient();

// GET - ดึงข้อมูลค่าเบี้ยเลี้ยงปัจจุบัน
export async function GET() {
  try {
    // ตรวจสอบว่ามีการตั้งค่าอยู่หรือไม่ (ใช้ key = 'allowance_rate')
    const settings = await prisma.$queryRaw`
      SELECT value FROM system_settings WHERE setting_key = 'allowance_rate' LIMIT 1
    ` as { value: string }[];

    if (settings.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          allowanceRate: parseFloat(settings[0].value),
        }
      });
    } else {
      // หากยังไม่มีการตั้งค่า ให้ใช้ค่าเริ่มต้น 150 บาท
      return NextResponse.json({
        success: true,
        data: {
          allowanceRate: 150.00,
        }
      });
    }
  } catch (error) {
    console.error('Error fetching allowance rate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถดึงข้อมูลค่าเบี้ยเลี้ยงได้' 
      },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตค่าเบี้ยเลี้ยง
export async function PUT(request: NextRequest) {
  try {
    const { allowanceRate } = await request.json();

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!allowanceRate || isNaN(parseFloat(allowanceRate)) || parseFloat(allowanceRate) < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณาระบุค่าเบี้ยเลี้ยงที่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

    const rate = parseFloat(allowanceRate);

    // ตรวจสอบว่ามีการตั้งค่าอยู่หรือไม่
    const existingSettings = await prisma.$queryRaw`
      SELECT id FROM system_settings WHERE setting_key = 'allowance_rate' LIMIT 1
    ` as { id: number }[];

    if (existingSettings.length > 0) {
      // อัปเดตค่าที่มีอยู่
      await prisma.$executeRaw`
        UPDATE system_settings 
        SET value = ${rate.toString()}, updated_at = NOW() 
        WHERE setting_key = 'allowance_rate'
      `;
    } else {
      // สร้างรายการใหม่
      await prisma.$executeRaw`
        INSERT INTO system_settings (setting_key, value, description, created_at, updated_at) 
        VALUES ('allowance_rate', ${rate.toString()}, 'อัตราค่าเบี้ยเลี้ยงต่อวัน (บาท)', NOW(), NOW())
      `;
    }

    // ล้าง cache เพื่อให้ระบบดึงค่าใหม่
    clearAllowanceCache();

    return NextResponse.json({
      success: true,
      message: 'อัปเดตค่าเบี้ยเลี้ยงเรียบร้อยแล้ว',
      data: {
        allowanceRate: rate,
      }
    });

  } catch (error) {
    console.error('Error updating allowance rate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถอัปเดตค่าเบี้ยเลี้ยงได้' 
      },
      { status: 500 }
    );
  }
}