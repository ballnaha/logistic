import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../../lib/prisma';

// GET - ดึงรายการ fuel records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const vehicleId = searchParams.get('vehicleId') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const skip = (page - 1) * limit;

    // สร้าง where condition
    const whereCondition: any = {};

    if (search) {
      // NOTE: vehicle.driverName does not exist in schema; driverName stored on FuelRecord or related Driver entities
      whereCondition.OR = [
        { vehicle: { licensePlate: { contains: search } } },
        { vehicle: { brand: { contains: search } } },
        { driverName: { contains: search } }, // fuel record driver name snapshot
        { vehicle: { mainDriver: { driverName: { contains: search } } } },
        { vehicle: { backupDriver: { driverName: { contains: search } } } },
        { remark: { contains: search } },
      ];
    }

    if (vehicleId) {
      whereCondition.vehicleId = parseInt(vehicleId);
    }

    // สร้าง orderBy condition
    const orderByCondition: any = {};
    if (sortBy === 'odometer') {
      // Special handling for nullable numeric fields
      orderByCondition[sortBy] = {
        sort: sortOrder === 'desc' ? 'desc' : 'asc',
        nulls: 'last'
      };
    } else {
      orderByCondition[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    }

    // เพิ่มช่วงวันที่ ถ้าระบุ (YYYY-MM-DD) ให้ครอบคลุมทั้งวันตาม timezone local
    if (startDate && endDate) {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      const startDateTime = new Date(sy, (sm || 1) - 1, sd || 1, 0, 0, 0, 0);
      const endDateTime = new Date(ey, (em || 1) - 1, ed || 1, 23, 59, 59, 999);
      whereCondition.fuelDate = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    // ดึงข้อมูล fuel records และนับจำนวนทั้งหมด
    const [fuelRecords, total] = await Promise.all([
      prisma.fuelRecord.findMany({
        where: whereCondition,
        select: {
          id: true,
          vehicleId: true,
          fuelDate: true,
          fuelAmount: true,
          odometer: true,
          remark: true,
          driverType: true,
          driverName: true,
          driverLicense: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          updatedBy: true,
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              brand: true,
              model: true,
              vehicleType: true,
              carImage: true,
              fuelTank: true,
              fuelConsume: true,
              fuelConsumeMth: true,
              mainDriver: {
                select: { id: true, driverName: true, driverImage: true, driverLicense: true }
              },
              backupDriver: {
                select: { id: true, driverName: true, driverImage: true, driverLicense: true }
              }
            },
          },
        },
        orderBy: orderByCondition,
        skip,
        take: limit,
      }),
      prisma.fuelRecord.count({ where: whereCondition }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: fuelRecords,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching fuel records:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลการเติมน้ำมันได้' },
      { status: 500 }
    );
  }
}

// POST - เพิ่ม fuel record ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    
    const {
      vehicleId,
      fuelDate,
      fuelAmount,
      odometer,
      remark,
      driverType,
      driverName,
      driverLicense,
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!vehicleId || !fuelDate || !fuelAmount) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลที่จำเป็น: รถ, วันที่, ปริมาณน้ำมัน' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ารถมีอยู่จริง
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: parseInt(vehicleId), isActive: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลรถที่ระบุ' },
        { status: 404 }
      );
    }

    // สร้าง fuel record ใหม่
    const fuelRecord = await prisma.fuelRecord.create({
      data: {
        vehicleId: parseInt(vehicleId),
        fuelDate: new Date(fuelDate),
        fuelAmount: parseFloat(fuelAmount),
        odometer: odometer ? parseInt(odometer) : null,
        remark: remark || null,
        driverType: driverType || null,
        driverName: driverName || null,
        driverLicense: driverLicense || null,
        createdBy: session?.user?.username || session?.user?.email || 'system',
      },
      include: {
        vehicle: {
          select: {
            licensePlate: true,
            brand: true,
            model: true,
            mainDriver: { select: { id: true, driverName: true, driverImage: true, driverLicense: true } },
            backupDriver: { select: { id: true, driverName: true, driverImage: true, driverLicense: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: fuelRecord,
      message: 'บันทึกการเติมน้ำมันสำเร็จ',
    });
  } catch (error) {
    console.error('Error creating fuel record:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกการเติมน้ำมันได้' },
      { status: 500 }
    );
  }
}
