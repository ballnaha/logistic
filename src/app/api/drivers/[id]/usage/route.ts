import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/drivers/[id]/usage - ตรวจสอบการใช้งานคนขับ
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

    // ตรวจสอบการใช้งานในระบบ
    // For trip records, we need to check driver_license field since there's no driver_id
    const driver = await prisma.$queryRaw<{driver_license: string}[]>`
      SELECT driver_license FROM drivers WHERE id = ${driverId}
    `;

    if (driver.length === 0) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driverLicense = driver[0].driver_license;

    // 1. Check vehicles that use this driver
    const vehiclesUsingDriver = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE main_driver_id = ${driverId} OR backup_driver_id = ${driverId}
    `;

    // 2. Check trip records
    const tripRecords = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM trip_records WHERE driver_license = ${driverLicense}
    `;

    // 3. Check fuel records
    const fuelRecords = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM fuel_records WHERE driver_license = ${driverLicense}
    `;

    // 4. Check substitute driving (driver_type = 'other')
    const substituteTrips = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM trip_records 
      WHERE driver_license = ${driverLicense} AND driver_type = 'other'
    `;

    const substituteFuel = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM fuel_records 
      WHERE driver_license = ${driverLicense} AND driver_type = 'other'
    `;

    const vehicleCount = Number(vehiclesUsingDriver[0]?.count || 0);
    const tripCount = Number(tripRecords[0]?.count || 0);
    const fuelCount = Number(fuelRecords[0]?.count || 0);
    const substituteTripsCount = Number(substituteTrips[0]?.count || 0);
    const substituteFuelCount = Number(substituteFuel[0]?.count || 0);
    const substituteCount = substituteTripsCount + substituteFuelCount;
    const totalUsage = vehicleCount + tripCount + fuelCount;

    const canDelete = totalUsage === 0 && substituteCount === 0;
    
    const usageDetails = canDelete 
      ? 'ไม่มีการใช้งาน' 
      : (() => {
          const details = [];
          if (vehicleCount > 0) details.push(`${vehicleCount} คันรถ`);
          if (tripCount > 0) details.push(`${tripCount} รายการเดินทาง`);
          if (fuelCount > 0) details.push(`${fuelCount} รายการเติมน้ำมัน`);
          if (substituteCount > 0) details.push(`${substituteCount} รายการขับแทน`);
          return `ใช้งานใน ${details.join(', ')}`;
        })();

    return NextResponse.json({
      canDelete,
      usageDetails,
      vehicleCount,
      tripCount,
      fuelCount,
      substituteCount,
      totalUsage: totalUsage + substituteCount
    });
  } catch (error) {
    console.error('Error checking driver usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}