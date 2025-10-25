import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

// Helper function สำหรับแปลงวันที่ไทย (DD/MM/YYYY) เป็น ISO
function parseThaiDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // ถ้าเป็น ISO format อยู่แล้ว
  if (dateStr.includes('-') && !dateStr.includes('/')) {
    return new Date(dateStr);
  }
  
  // ถ้าเป็น DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
  }
  
  return new Date(dateStr);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vehicleId = searchParams.get('vehicleId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!vehicleId) {
      return NextResponse.json(
        { success: false, error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // สร้าง where clause
    const whereClause: any = {
      vehicleId: parseInt(vehicleId),
    };

    // เพิ่ม date filter ถ้ามี (รองรับ DD/MM/YYYY และ ISO format)
    if (startDate || endDate) {
      whereClause.departureDate = {};
      if (startDate) {
        const parsedStartDate = parseThaiDate(startDate);
        if (parsedStartDate) {
          whereClause.departureDate.gte = parsedStartDate;
        }
      }
      if (endDate) {
        const parsedEndDate = parseThaiDate(endDate);
        if (parsedEndDate) {
          // ตั้งเวลาเป็น 23:59:59 สำหรับวันสิ้นสุด
          parsedEndDate.setHours(23, 59, 59, 999);
          whereClause.departureDate.lte = parsedEndDate;
        }
      }
    }

    // ใช้ parallel queries เพื่อเพิ่มประสิทธิภาพ
    const [totalRecords, tripRecords, summaryStats, vehicleInfo] = await Promise.all([
      // นับจำนวน records ทั้งหมด
      prisma.tripRecord.count({
        where: whereClause,
      }),
      
      // ดึงข้อมูล trip records พร้อม relations แบบ optimized
      prisma.tripRecord.findMany({
        where: whereClause,
        select: {
          id: true,
          vehicleId: true,
          customerId: true,
          departureDate: true,
          departureTime: true,
          returnDate: true,
          returnTime: true,
          odometerBefore: true,
          odometerAfter: true,
          actualDistance: true,
          estimatedDistance: true,
          days: true,
          allowanceRate: true,
          totalAllowance: true,
          loadingDate: true,
          distanceCheckFee: true,
          fuelCost: true,
          tollFee: true,
          repairCost: true,
          documentNumber: true,
          remark: true,
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              brand: true,
              model: true,
              vehicleType: true,
              driverName: true,
              backupDriverName: true,
              carImage: true,
            },
          },
          customer: {
            select: {
              id: true,
              cmCode: true,
              cmName: true,
              cmAddress: true,
              cmMileage: true,
            },
          },
          tripItems: {
            select: {
              id: true,
              itemId: true,
              quantity: true,
              unit: true,
              unitPrice: true,
              totalPrice: true,
              remark: true,
              item: {
                select: {
                  id: true,
                  ptPart: true,
                  ptDesc1: true,
                  ptDesc2: true,
                },
              },
            },
          },
        },
        orderBy: {
          departureDate: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      // คำนวณสถิติรวม
      prisma.tripRecord.aggregate({
        where: whereClause,
        _sum: {
          actualDistance: true,
          estimatedDistance: true,
          totalAllowance: true,
          fuelCost: true,
          tollFee: true,
          repairCost: true,
          distanceCheckFee: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          actualDistance: true,
          days: true,
        },
      }),

      // ดึงข้อมูลรถ
      prisma.vehicle.findUnique({
        where: { id: parseInt(vehicleId) },
        select: {
          id: true,
          licensePlate: true,
          brand: true,
          model: true,
          vehicleType: true,
          color: true,
          driverName: true,
          backupDriverName: true,
          carImage: true,
          driverImage: true,
          backupDriverImage: true,
          fuelTank: true,
          fuelConsume: true,
          weight: true,
        },
      }),
    ]);

    if (!vehicleInfo) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // คำนวณสถิติเพิ่มเติม
    const totalDistance = summaryStats._sum.actualDistance || 0;
    const totalTrips = summaryStats._count.id || 0;
    const averageDistance = summaryStats._avg.actualDistance || 0;
    const averageDays = summaryStats._avg.days || 0;

    // คำนวณค่าใช้จ่ายรวม
    const totalCosts = {
      allowance: Number(summaryStats._sum.totalAllowance) || 0,
      fuel: Number(summaryStats._sum.fuelCost) || 0,
      toll: Number(summaryStats._sum.tollFee) || 0,
      repair: Number(summaryStats._sum.repairCost) || 0,
      distanceCheck: Number(summaryStats._sum.distanceCheckFee) || 0,
    };

    const grandTotal = totalCosts.allowance + totalCosts.fuel + totalCosts.toll + totalCosts.repair + totalCosts.distanceCheck;

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalRecords,
      recordsPerPage: limit,
    };

    const response = NextResponse.json({
      success: true,
      data: {
        vehicle: vehicleInfo,
        tripRecords,
        summary: {
          totalTrips,
          totalDistance,
          averageDistance,
          averageDays,
          costs: totalCosts,
          grandTotal,
        },
        pagination,
      },
    });

    // เพิ่ม cache headers สำหรับปรับปรุงประสิทธิภาพ
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    
    return response;
  } catch (error) {
    console.error('Error fetching trip records report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
  // Note: No need to disconnect when using singleton prisma client
}
