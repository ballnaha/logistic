import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/vehicles/available-for-driver - ดึงรายการรถที่ยังไม่มีคนขับ
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ดึงรถที่ยังไม่มีคนขับหรือมีคนขับเป็นค่าว่าง
    const vehicles = await prisma.vehicle.findMany({
      where: {
        isActive: true,
        OR: [
          { driverName: null },
          { driverName: '' }
        ]
      },
      select: {
        id: true,
        licensePlate: true,
        brand: true,
        model: true,
        vehicleType: true,
      },
      orderBy: [
        { brand: 'asc' },
        { model: 'asc' }
      ],
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Error fetching available vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}