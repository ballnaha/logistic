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

    // รับ query parameters สำหรับ filter
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // สร้าง where condition สำหรับ fuel records filter
    const fuelRecordWhere: any = {};
    
    if (month || year) {
      const dateFilter: any = {};
      
      if (year) {
        const yearNum = parseInt(year);
        if (month) {
          // Filter by specific month and year
          const monthNum = parseInt(month);
          const startDate = new Date(yearNum, monthNum - 1, 1);
          const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
          
          dateFilter.gte = startDate;
          dateFilter.lte = endDate;
        } else {
          // Filter by year only
          const startDate = new Date(yearNum, 0, 1);
          const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
          
          dateFilter.gte = startDate;
          dateFilter.lte = endDate;
        }
      } else if (month) {
        // Filter by month only (current year)
        const currentYear = new Date().getFullYear();
        const monthNum = parseInt(month);
        const startDate = new Date(currentYear, monthNum - 1, 1);
        const endDate = new Date(currentYear, monthNum, 0, 23, 59, 59, 999);
        
        dateFilter.gte = startDate;
        dateFilter.lte = endDate;
      }
      
      fuelRecordWhere.fuelDate = dateFilter;
    }

    // ดึงยี่ห้อ, ประเภทรถ, ทะเบียนรถ และข้อมูลรถทั้งหมดแบบ parallel และ optimized
    const [brands, vehicleTypes, licensePlates, vehicles] = await Promise.all([
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
      }),
      // ดึงข้อมูลรถที่มีการเติมน้ำมันในช่วงเวลาที่เลือก (ถ้ามี filter)
      (month || year) 
        ? prisma.vehicle.findMany({
            where: {
              isActive: true,
              licensePlate: {
                not: null
              },
              NOT: {
                licensePlate: ''
              },
              fuelRecords: {
                some: fuelRecordWhere
              }
            },
            select: {
              id: true,
              licensePlate: true,
              vehicleType: true
            },
            orderBy: {
              licensePlate: 'asc'
            }
          })
        : prisma.vehicle.findMany({
            where: {
              isActive: true,
              licensePlate: {
                not: null
              },
              NOT: {
                licensePlate: ''
              }
            },
            select: {
              id: true,
              licensePlate: true,
              vehicleType: true
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
      },
      vehicles: vehicles // เพิ่มข้อมูลรถทั้งหมดสำหรับ filter
    });

  } catch (error) {
    console.error('Error fetching vehicle options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicle options' },
      { status: 500 }
    );
  }
}
