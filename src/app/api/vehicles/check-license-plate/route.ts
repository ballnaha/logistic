import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { licensePlate, excludeId } = body;

    if (!licensePlate) {
      return NextResponse.json(
        { error: 'License plate is required' },
        { status: 400 }
      );
    }

    // ตรวจสอบทะเบียนรถซ้ำ (exact match)
    const whereCondition: any = {
      licensePlate: licensePlate.trim(),
      isActive: true
    };

    // ถ้ามี excludeId แสดงว่าเป็นการแก้ไข ไม่ต้องนับรถคันปัจจุบัน
    if (excludeId) {
      whereCondition.NOT = {
        id: parseInt(excludeId)
      };
    }

    const existingVehicle = await prisma.vehicle.findFirst({
      where: whereCondition
    });

    return NextResponse.json({
      success: true,
      exists: !!existingVehicle,
      message: existingVehicle 
        ? 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว' 
        : 'ทะเบียนรถนี้ใช้ได้'
    });

  } catch (error) {
    console.error('Error checking license plate:', error);
    return NextResponse.json(
      { error: 'Failed to check license plate' },
      { status: 500 }
    );
  }
}
