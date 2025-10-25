import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET - ดึงรายการ options สำหรับ dropdown
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ดึงรายการรถที่ active ด้วย raw SQL เพื่อรวม driver data
    const vehiclesRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        v.car_id as id,
        v.license_plate as licensePlate,
        v.car_brand as brand,
        v.car_model as model,
        v.car_type as vehicleType,
        md.driver_name as driverName,
        md.driver_license as driverLicense,
        md.driver_image as driverImage,
        bd.driver_name as backupDriverName,
        bd.driver_license as backupDriverLicense,
        bd.driver_image as backupDriverImage
      FROM vehicles v
      LEFT JOIN drivers md ON v.main_driver_id = md.id
      LEFT JOIN drivers bd ON v.backup_driver_id = bd.id
      WHERE v.is_active = 1
      ORDER BY v.license_plate ASC
    `);

    // Transform raw data to expected format
    const vehicles = (vehiclesRaw as any[]).map(row => ({
      id: row.id,
      licensePlate: row.licensePlate,
      brand: row.brand,
      model: row.model,
      vehicleType: row.vehicleType,
      driverName: row.driverName,
      driverLicense: row.driverLicense,
      driverImage: row.driverImage,
      backupDriverName: row.backupDriverName,
      backupDriverLicense: row.backupDriverLicense,
      backupDriverImage: row.backupDriverImage,
    }));

    // ดึงรายการลูกค้า
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        cmCode: true,
        cmName: true,
        cmAddress: true,
        cmMileage: true,
      },
      orderBy: { cmCode: 'asc' },
    });

    // ดึงรายการพัสดุ
    const items = await prisma.item.findMany({
      select: {
        id: true,
        ptPart: true,
        ptDesc1: true,
        ptDesc2: true,
        ptUm: true,
        ptPrice: true,
      },
      orderBy: { ptPart: 'asc' },
    });

    return NextResponse.json({
      vehicles,
      customers,
      items,
    });
  } catch (error) {
    console.error('Error fetching trip record options:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
