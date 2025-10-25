import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '../../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ license: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { license } = await params;
    
    if (!license) {
      return NextResponse.json(
        { error: 'Driver license is required' },
        { status: 400 }
      );
    }

    // Decode the license parameter (in case it was URL encoded)
    const decodedLicense = decodeURIComponent(license);

    // Find driver by license number using raw SQL as fallback
    console.log('🔍 Searching for driver with license:', decodedLicense);
    
    try {
      // Try Prisma query first
      const driver = await prisma.driver.findFirst({
        where: {
          driverLicense: decodedLicense
        }
      });

      console.log('🔍 Prisma query result:', driver);

      if (driver) {
        return NextResponse.json({
          success: true,
          driver: {
            id: driver.id,
            driverName: driver.driverName,
            driverLicense: driver.driverLicense,
            driverImage: driver.driverImage,
          },
        });
      }
    } catch (prismaError) {
      console.warn('⚠️ Prisma query failed, trying raw SQL:', prismaError);
      
      // Fallback to raw SQL
      const rawResult = await prisma.$queryRaw`
        SELECT id, driver_name as driverName, driver_license as driverLicense, driver_image as driverImage 
        FROM drivers 
        WHERE driver_license = ${decodedLicense}
        LIMIT 1
      ` as any[];

      console.log('🔍 Raw SQL result:', rawResult);

      if (rawResult && rawResult.length > 0) {
        return NextResponse.json({
          success: true,
          driver: rawResult[0],
        });
      }
    }

    // If no driver found
    return NextResponse.json(
      { error: 'Driver not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('❌ Error fetching driver by license:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}