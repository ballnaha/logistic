import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/drivers/[id]/vehicles - ดึงข้อมูลรถที่คนขับขับอยู่
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: 'Invalid driver ID' }, { status: 400 });
    }

    // ตรวจสอบว่าคนขับมีอยู่จริง
    const driverData = await prisma.$queryRaw<{id: number; driver_license: string}[]>`
      SELECT id, driver_license FROM drivers WHERE id = ${driverId}
    `;

    if (driverData.length === 0) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driverLicense = driverData[0].driver_license;

    // ดึงรถที่คนขับเป็นคนขับหลัก
    const mainDriverVehicles = await prisma.$queryRaw<{
      car_id: number;
      license_plate: string;
      car_brand: string;
      car_model: string;
    }[]>`
      SELECT car_id, license_plate, car_brand, car_model
      FROM vehicles
      WHERE main_driver_id = ${driverId} AND is_active = 1
      ORDER BY license_plate
    `;

    // ดึงรถที่คนขับเป็นคนขับสำรอง
    const backupDriverVehicles = await prisma.$queryRaw<{
      car_id: number;
      license_plate: string;
      car_brand: string;
      car_model: string;
    }[]>`
      SELECT car_id, license_plate, car_brand, car_model
      FROM vehicles
      WHERE backup_driver_id = ${driverId} AND is_active = 1
      ORDER BY license_plate
    `;

    // ดึงรถที่คนขับเคยขับแทน (จาก trip_records และ fuel_records ที่ driver_type = 'other')
    const substituteVehiclesFromTrips = await prisma.$queryRaw<{
      car_id: number;
      license_plate: string;
      car_brand: string;
      car_model: string;
    }[]>`
      SELECT DISTINCT v.car_id, v.license_plate, v.car_brand, v.car_model
      FROM trip_records tr
      INNER JOIN vehicles v ON tr.vehicle_id = v.car_id
      WHERE tr.driver_license = ${driverLicense} 
        AND tr.driver_type = 'other'
        AND v.is_active = 1
      ORDER BY v.license_plate
    `;

    const substituteVehiclesFromFuel = await prisma.$queryRaw<{
      car_id: number;
      license_plate: string;
      car_brand: string;
      car_model: string;
    }[]>`
      SELECT DISTINCT v.car_id, v.license_plate, v.car_brand, v.car_model
      FROM fuel_records fr
      INNER JOIN vehicles v ON fr.vehicle_id = v.car_id
      WHERE fr.driver_license = ${driverLicense} 
        AND fr.driver_type = 'other'
        AND v.is_active = 1
      ORDER BY v.license_plate
    `;

    // รวมรายการรถที่ขับแทนและลบรายการซ้ำ
    const substituteVehiclesMap = new Map();
    [...substituteVehiclesFromTrips, ...substituteVehiclesFromFuel].forEach(v => {
      if (!substituteVehiclesMap.has(v.car_id)) {
        substituteVehiclesMap.set(v.car_id, v);
      }
    });
    const substituteVehicles = Array.from(substituteVehiclesMap.values());

    return NextResponse.json({
      mainDriver: mainDriverVehicles.map(v => ({
        id: v.car_id,
        licensePlate: v.license_plate || '-',
        brand: v.car_brand || '-',
        model: v.car_model || '-',
      })),
      backupDriver: backupDriverVehicles.map(v => ({
        id: v.car_id,
        licensePlate: v.license_plate || '-',
        brand: v.car_brand || '-',
        model: v.car_model || '-',
      })),
      substituteDriver: substituteVehicles.map(v => ({
        id: v.car_id,
        licensePlate: v.license_plate || '-',
        brand: v.car_brand || '-',
        model: v.car_model || '-',
      })),
    });
  } catch (error) {
    console.error('Error fetching driver vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
