import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/drivers-new/options - ดึงรายการคนขับสำหรับ dropdown
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // ใช้ raw query เพื่อหลีกเลี่ยงปัญหา Prisma client
    const drivers = activeOnly 
      ? await prisma.$queryRaw`
          SELECT id, driver_name, driver_license, driver_image, is_active
          FROM drivers 
          WHERE is_active = 1
          ORDER BY driver_name ASC
        `
      : await prisma.$queryRaw`
          SELECT id, driver_name, driver_license, driver_image, is_active
          FROM drivers 
          ORDER BY driver_name ASC
        `;

    return NextResponse.json({ 
      drivers: (drivers as any[]).map(driver => ({
        id: driver.id,
        driverName: driver.driver_name,
        driverLicense: driver.driver_license,
        driverImage: driver.driver_image,
        isActive: driver.is_active === 1,
      }))
    });
  } catch (error) {
    console.error('Error fetching driver options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}