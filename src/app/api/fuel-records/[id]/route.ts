import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

interface RouteParams {
  params: Promise<{ id: string; }>;
}

// GET - ดึงข้อมูล fuel record ตาม ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const fuelRecordId = parseInt(resolvedParams.id);

    const fuelRecord = await prisma.fuelRecord.findUnique({
      where: {
        id: fuelRecordId,
      },
      include: {
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
            mainDriver: { select: { id: true, driverName: true, driverImage: true, driverLicense: true } },
            backupDriver: { select: { id: true, driverName: true, driverImage: true, driverLicense: true } },
          },
        },
      },
    });

    if (!fuelRecord) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลการเติมน้ำมัน' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      fuelRecord: fuelRecord,
    });
  } catch (error) {
    console.error('Error fetching fuel record:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลการเติมน้ำมันได้' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูล fuel record
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;
    const fuelRecordId = parseInt(resolvedParams.id);
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

    // ตรวจสอบว่า fuel record มีอยู่จริง
    const existingRecord = await prisma.fuelRecord.findUnique({
      where: { id: fuelRecordId },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลการเติมน้ำมันที่ต้องการแก้ไข' },
        { status: 404 }
      );
    }

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!vehicleId || !fuelDate || !fuelAmount) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลที่จำเป็น: รถ, วันที่, ปริมาณน้ำมัน' },
        { status: 400 }
      );
    }

    // อัปเดต fuel record
    const updatedRecord = await prisma.fuelRecord.update({
      where: { id: fuelRecordId },
      data: {
        vehicleId: parseInt(vehicleId),
        fuelDate: new Date(fuelDate),
        fuelAmount: parseFloat(fuelAmount),
        odometer: odometer ? parseInt(odometer) : null,
        remark: remark || null,
        driverType: driverType || null,
        driverName: driverName || null,
        driverLicense: driverLicense || null,
        updatedBy: session?.user?.username || session?.user?.email || 'system',
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
      data: updatedRecord,
      message: 'แก้ไขข้อมูลการเติมน้ำมันสำเร็จ',
    });
  } catch (error) {
    console.error('Error updating fuel record:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถแก้ไขข้อมูลการเติมน้ำมันได้' },
      { status: 500 }
    );
  }
}

// DELETE - ลบ fuel record (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const fuelRecordId = parseInt(resolvedParams.id);

    // ตรวจสอบว่า fuel record มีอยู่จริง
    const existingRecord = await prisma.fuelRecord.findUnique({
      where: { id: fuelRecordId },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลการเติมน้ำมันที่ต้องการลบ' },
        { status: 404 }
      );
    }

    // Hard delete - เนื่องจาก FuelRecord ไม่มี isActive field
    await prisma.fuelRecord.delete({
      where: { id: fuelRecordId },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลการเติมน้ำมันสำเร็จ',
    });
  } catch (error) {
    console.error('Error deleting fuel record:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถลบข้อมูลการเติมน้ำมันได้' },
      { status: 500 }
    );
  }
}
