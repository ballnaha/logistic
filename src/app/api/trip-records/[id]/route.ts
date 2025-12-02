import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { getAllowanceRateServer } from '@/utils/allowance';

// GET - ดึงข้อมูล trip record ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid trip record ID' },
        { status: 400 }
      );
    }

    const tripRecord = await prisma.tripRecord.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            mainDriver: true,
            backupDriver: true,
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
          include: {
            item: {
              select: {
                id: true,
                ptPart: true,
                ptDesc1: true,
                ptDesc2: true,
                ptUm: true,
                ptPrice: true,
              }
            }
          }
        }
      },
    });

    if (!tripRecord) {
      return NextResponse.json(
        { error: 'ไม่พบบันทึกการเดินทาง' },
        { status: 404 }
      );
    }

    return NextResponse.json({ trip: tripRecord });
  } catch (error) {
    console.error('Error fetching trip record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - อัปเดต trip record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid trip record ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      vehicleId,
      customerId,
      departureDate,
      departureTime,
      returnDate,
      returnTime,
      odometerBefore,
      odometerAfter,
      actualDistance,
      estimatedDistance,
      loadingDate,
      distanceCheckFee,
      fuelCost,
      tollFee,
      repairCost,
      tripFee,
      tripItems,
      documentNumber,
      remark,
      driverType,
      driverName,
      driverLicense,
    } = body;

    // ตรวจสอบว่า trip record มีอยู่จริง
    const existingTrip = await prisma.tripRecord.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: 'ไม่พบบันทึกการเดินทาง' },
        { status: 404 }
      );
    }

    // ตรวจสอบข้อมูลที่จำเป็นแบบละเอียด (returnDate / returnTime optional)
    const missingFields: string[] = [];
    if (!vehicleId) missingFields.push('vehicleId');
    if (!customerId) missingFields.push('customerId');
    if (!departureDate) missingFields.push('departureDate');
    if (!departureTime) missingFields.push('departureTime');
    // actualDistance เป็น optional แล้ว - ไม่ต้อง validate

    // Driver validation
    if (driverType && !['main','backup','other'].includes(driverType)) {
      return NextResponse.json({ error: 'รูปแบบ driverType ไม่ถูกต้อง' }, { status: 400 });
    }
    if (driverType === 'other' && !driverName) {
      missingFields.push('driverName');
    }

    if (returnDate && !returnTime) {
      return NextResponse.json({ error: 'ต้องระบุเวลากลับเมื่อมีวันที่กลับ' }, { status: 400 });
    }

    if (departureTime && !departureDate) {
      return NextResponse.json({ error: 'มีเวลาออกเดินทาง แต่ไม่ได้ระบุวันที่ออก' }, { status: 400 });
    }
    if (returnTime && !returnDate) {
      return NextResponse.json({ error: 'มีเวลากลับ แต่ไม่ได้ระบุวันที่กลับ' }, { status: 400 });
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน', missingFields },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามี vehicle และ customer อยู่จริง
    const [vehicle, customer] = await Promise.all([
      prisma.vehicle.findFirst({ where: { id: parseInt(vehicleId) } }),
      prisma.customer.findFirst({ where: { id: parseInt(customerId) } }),
    ]);

    if (!vehicle) {
      return NextResponse.json(
        { error: 'ไม่พบรถยนต์ที่ระบุ' },
        { status: 404 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'ไม่พบลูกค้าที่ระบุ' },
        { status: 404 }
      );
    }

    // คำนวณจำนวนวันใหม่ (optional returnDate)
    const depDate = new Date(departureDate);
    let retDate: Date | null = null;
    let daysDiff = 0;
    if (returnDate) {
      retDate = new Date(returnDate);
      const timeDiff = retDate.getTime() - depDate.getTime();
      daysDiff = timeDiff >= 0 ? Math.ceil(timeDiff / (1000 * 3600 * 24)) : 0;
    }
    
    // ถ้า >= 1 วัน ได้เบี้ยเลี้ยง (ใช้อัตราเดิมที่บันทึกไว้)
    const allowanceRate = Number(existingTrip.allowanceRate); // ใช้อัตราเดิม ไม่ใช่อัตราปัจจุบันจากระบบ
    const totalAllowance = daysDiff >= 1 ? daysDiff * allowanceRate : 0;

    // คำนวณระยะทางจากเลขไมล์ (ถ้ามี) - สำหรับข้อมูลเสริม
    let calculatedDistanceFromOdometer = null;
    if (odometerBefore && odometerAfter && odometerAfter > odometerBefore) {
      calculatedDistanceFromOdometer = odometerAfter - odometerBefore;
    }

    // อัปเดต trip record
    const updatedTripRecord = await prisma.tripRecord.update({
      where: { id },
      data: {
        vehicleId: parseInt(vehicleId),
        customerId: parseInt(customerId),
  departureDate: new Date(departureDate),
  departureTime: departureTime || '00:00',
  // nullable now: only set when provided
  // @ts-ignore pending prisma generate (schema updated to nullable)
  returnDate: retDate ? retDate : null,
  // @ts-ignore pending prisma generate (schema updated to nullable)
  returnTime: retDate ? (returnTime || departureTime || '00:00') : null,
        odometerBefore: odometerBefore ? parseInt(odometerBefore) : null,
        odometerAfter: odometerAfter ? parseInt(odometerAfter) : null,
        actualDistance: actualDistance ? parseFloat(actualDistance) : null,
        estimatedDistance: estimatedDistance ? parseFloat(estimatedDistance) : 0,
  // @ts-ignore new prisma fields may require generate
  driverLicense: driverLicense || null,
  // @ts-ignore new prisma fields may require generate
  driverType: driverType || null,
  // @ts-ignore new prisma fields may require generate
  driverName: driverName || null,
        days: daysDiff,
        allowanceRate,
        totalAllowance,
        loadingDate: loadingDate ? new Date(loadingDate) : null,
        distanceCheckFee: distanceCheckFee ? parseFloat(distanceCheckFee) : null,
        fuelCost: fuelCost ? parseFloat(fuelCost) : null,
        tollFee: tollFee ? parseFloat(tollFee) : null,
        repairCost: repairCost ? parseFloat(repairCost) : null,
        tripFee: tripFee !== undefined ? parseFloat(tripFee) : null,
        documentNumber: documentNumber || null,
        remark,
        updatedBy: session.user?.username || session.user?.email || 'system',
      },
      include: {
        vehicle: {
          include: {
            mainDriver: true,
            backupDriver: true,
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
      },
    });

    // อัปเดต trip items
    if (tripItems !== undefined) {
      console.log('Received tripItems:', tripItems);
      
      // ลบ items เดิมทั้งหมด
      await prisma.tripItem.deleteMany({
        where: { tripRecordId: id }
      });

      // สร้าง items ใหม่ถ้ามี
      if (Array.isArray(tripItems) && tripItems.length > 0) {
        const itemsToCreate = tripItems.map((item: any) => ({
          tripRecordId: id,
          itemId: parseInt(item.itemId),
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
          totalPrice: item.totalPrice ? parseFloat(item.totalPrice) : null,
          remark: item.remark || null,
        }));
        
        console.log('Creating tripItems:', itemsToCreate);
        
        await prisma.tripItem.createMany({
          data: itemsToCreate
        });
      }
    }

    // ดึงข้อมูลรวม trip items
    const finalTripRecord = await prisma.tripRecord.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            mainDriver: true,
            backupDriver: true,
          }
        },
        customer: {
          select: {
            id: true,
            cmCode: true,
            cmName: true,
            cmMileage: true,
          }
        },
        tripItems: {
          include: {
            item: {
              select: {
                id: true,
                ptPart: true,
                ptDesc1: true,
                ptDesc2: true,
                ptUm: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      message: 'อัปเดตบันทึกการเดินทางสำเร็จ',
      trip: finalTripRecord,
    });
  } catch (error) {
    console.error('Error updating trip record:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตบันทึกการเดินทาง' },
      { status: 500 }
    );
  }
}

// DELETE - ลบ trip record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid trip record ID' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า trip record มีอยู่จริง
    const existingTrip = await prisma.tripRecord.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: 'ไม่พบบันทึกการเดินทาง' },
        { status: 404 }
      );
    }

    // ลบ trip record
    await prisma.tripRecord.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'ลบบันทึกการเดินทางสำเร็จ',
    });
  } catch (error) {
    console.error('Error deleting trip record:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบบันทึกการเดินทาง' },
      { status: 500 }
    );
  }
}
