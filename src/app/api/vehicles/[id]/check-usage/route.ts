import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - ตรวจสอบว่ารถถูกใช้งานใน trip records หรือยัง
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const vehicleId = parseInt(resolvedParams.id);
    
    // ตรวจสอบว่ารถมีอยู่หรือไม่
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        licensePlate: true,
        isActive: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่ารถถูกใช้ใน trip records หรือไม่
    const tripCount = await prisma.tripRecord.count({
      where: {
        vehicleId: vehicleId,
      },
    });

    // ตรวจสอบว่ารถถูกใช้ใน fuel records หรือไม่
    const fuelRecordCount = await prisma.fuelRecord.count({
      where: {
        vehicleId: vehicleId,
      },
    });

    const isInUse = tripCount > 0 || fuelRecordCount > 0;

    return NextResponse.json({
      success: true,
      data: {
        vehicleId: vehicleId,
        licensePlate: vehicle.licensePlate,
        isActive: vehicle.isActive,
        isInUse: isInUse,
        tripRecordsCount: tripCount,
        fuelRecordsCount: fuelRecordCount,
        canDelete: !isInUse, // สามารถลบได้ถ้าไม่มีการใช้งาน
        canDeactivate: true, // สามารถยกเลิกใช้งานได้เสมอ
      },
    });
  } catch (error) {
    console.error('Error checking vehicle usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check vehicle usage' },
      { status: 500 }
    );
  }
}