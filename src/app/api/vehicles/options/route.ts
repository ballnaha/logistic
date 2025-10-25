import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET - ดึงตัวเลือกสำหรับ dropdown (brands, vehicle types)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ดึงยี่ห้อ, ประเภทรถ และทะเบียนรถแบบ parallel และ optimized
    const [brands, vehicleTypes, licensePlates] = await Promise.all([
      // ดึงยี่ห้อรถ - ใช้ groupBy แทน distinct สำหรับประสิทธิภาพที่ดีกว่า
      prisma.vehicle.groupBy({
        by: ['brand'],
        where: {
          isActive: true,
          brand: {
            not: ''
          }
        },
        orderBy: {
          brand: 'asc'
        }
      }),
      // ดึงประเภทรถ - ใช้ groupBy แทน distinct
      prisma.vehicle.groupBy({
        by: ['vehicleType'], 
        where: {
          isActive: true,
          vehicleType: {
            not: ''
          }
        },
        orderBy: {
          vehicleType: 'asc'
        }
      }),
      // ดึงทะเบียนรถ - ใช้ groupBy แทน distinct
      prisma.vehicle.groupBy({
        by: ['licensePlate'],
        where: {
          isActive: true,
          licensePlate: {
            not: null
          },
          NOT: {
            licensePlate: ''
          }
        },
        orderBy: {
          licensePlate: 'asc'
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        brands: brands.map(item => item.brand).filter(Boolean),
        vehicleTypes: vehicleTypes.map(item => item.vehicleType).filter(Boolean),
        licensePlates: licensePlates.map(item => item.licensePlate).filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Error fetching vehicle options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicle options' },
      { status: 500 }
    );
  }
}
