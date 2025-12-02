import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: ดึงค่าระยะทางขั้นต่ำ
export async function GET() {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { settingKey: 'free_distance_threshold' },
    });

    if (!setting) {
      // ถ้ายังไม่มีค่า ให้ส่ง default เป็น 1500
      return NextResponse.json({
        success: true,
        data: { value: 1500 },
      });
    }

    return NextResponse.json({
      success: true,
      data: { value: parseFloat(setting.value) },
    });
  } catch (error) {
    console.error('Error fetching free distance threshold:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลระยะทางขั้นต่ำได้' },
      { status: 500 }
    );
  }
}

// PUT: อัปเดตค่าระยะทางขั้นต่ำ
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { value } = body;

    // ตรวจสอบค่าที่ส่งมา
    if (value === undefined || value === null) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุค่าระยะทางขั้นต่ำ' },
        { status: 400 }
      );
    }

    const threshold = parseFloat(value);
    if (isNaN(threshold) || threshold < 0) {
      return NextResponse.json(
        { success: false, error: 'ค่าระยะทางขั้นต่ำไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // อัปเดตหรือสร้างใหม่ใน system_settings
    const setting = await prisma.systemSettings.upsert({
      where: { settingKey: 'free_distance_threshold' },
      update: {
        value: threshold.toString(),
        updatedAt: new Date(),
      },
      create: {
        settingKey: 'free_distance_threshold',
        value: threshold.toString(),
        description: 'ระยะทางขั้นต่ำที่ไม่คิดค่าระยะทาง (กม.)',
      },
    });

    return NextResponse.json({
      success: true,
      data: { value: parseFloat(setting.value) },
      message: 'บันทึกระยะทางขั้นต่ำเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('Error updating free distance threshold:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกระยะทางขั้นต่ำได้' },
      { status: 500 }
    );
  }
}
