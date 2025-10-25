import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { getAllowanceRateServer } from '@/utils/allowance';

// GET - ดึงรายการ trip records
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const vehicleId = searchParams.get('vehicleId') || '';
    const customerId = searchParams.get('customerId') || '';
    const vehicleType = searchParams.get('vehicleType') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'departureDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // สร้าง orderBy object
    const getOrderBy = () => {
      const validSortFields = [
        'departureDate', 'returnDate', 'actualDistance', 'estimatedDistance',
        'totalAllowance', 'days', 'createdAt', 'updatedAt'
      ];
      
      const field = validSortFields.includes(sortBy) ? sortBy : 'departureDate';
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      
      console.log('API Sort params:', { sortBy, sortOrder, field, order });
      
      return { [field]: order };
    };

    // สร้าง where condition
    const whereCondition: any = {};

    if (search) {
      whereCondition.OR = [
        { vehicle: { licensePlate: { contains: search } } },
        { vehicle: { brand: { contains: search } } },
        { customer: { cmName: { contains: search } } },
        { customer: { cmCode: { contains: search } } },
        { remark: { contains: search } },
      ];
    }

    if (vehicleId) {
      whereCondition.vehicleId = parseInt(vehicleId);
    }

    if (customerId) {
      whereCondition.customerId = parseInt(customerId);
    }

    if (vehicleType) {
      whereCondition.vehicle = {
        vehicleType: vehicleType
      };
    }

    if (startDate && endDate) {
      // แปลงวันที่แบบ Local (หลีกเลี่ยง UTC shift) และให้ครอบคลุมทั้งวัน
      const parseLocalDate = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      };

      const startBase = parseLocalDate(startDate);
      const endBase = parseLocalDate(endDate);

      const startDateTime = new Date(startBase.getFullYear(), startBase.getMonth(), startBase.getDate(), 0, 0, 0, 0);
      const endDateTime = new Date(endBase.getFullYear(), endBase.getMonth(), endBase.getDate(), 23, 59, 59, 999);

      // กรองเฉพาะเที่ยวรถที่ departureDate อยู่ในช่วงที่กำหนด (รวมวันเริ่มและวันสิ้นสุด)
      whereCondition.departureDate = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    // ดึงข้อมูล trip records พร้อม include vehicle และ customer
    const [tripRecords, total] = await Promise.all([
      prisma.tripRecord.findMany({
        where: whereCondition,
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              brand: true,
              model: true,
              vehicleType: true,
              carImage: true,
              mainDriver: {
                select: {
                  id: true,
                  driverName: true,
                  driverLicense: true,
                  driverImage: true,
                },
              },
              backupDriver: {
                select: {
                  id: true,
                  driverName: true,
                  driverLicense: true,
                  driverImage: true,
                },
              },
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
                }
              }
            }
          },
        },
        orderBy: getOrderBy(),
        skip,
        take: limit,
      }),
      prisma.tripRecord.count({ where: whereCondition }),
    ]);

    return NextResponse.json({
      trips: tripRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching trip records:', error);
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

// POST - สร้าง trip record ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      tripItems,
      documentNumber,
      remark,
      driverLicense, // รับ driver license แทน driverType
      driverName,
      driverType, // เพิ่มการรับ driverType
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็นแบบละเอียด
    const missingFields: string[] = [];
    if (!vehicleId) missingFields.push('vehicleId');
    if (!customerId) missingFields.push('customerId');
    if (!departureDate) missingFields.push('departureDate');
  // returnDate optional now
    // actualDistance เป็น optional แล้ว - ไม่ต้อง validate
    if (!departureTime) missingFields.push('departureTime');
  // returnTime optional now

    // Driver validation - ถ้ามี driverLicense ให้หา driver ที่ตรงกัน
    let selectedDriver = null;
    if (driverLicense) {
      console.log('Looking for driver with license:', driverLicense);
      const driverResult = await prisma.$queryRawUnsafe(
        'SELECT id, driver_name as driverName, driver_license as driverLicense FROM drivers WHERE driver_license = ? AND is_active = 1 LIMIT 1',
        driverLicense
      ) as any[];
      
      console.log('Driver query result:', driverResult);
      
      if (driverResult.length === 0) {
        console.log('No driver found with license:', driverLicense);
        return NextResponse.json(
          { error: 'ไม่พบคนขับที่มีใบขับขี่นี้ในระบบ' },
          { status: 404 }
        );
      }
      
      selectedDriver = driverResult[0];
      console.log('Selected driver:', selectedDriver);
    }

    // Require returnTime if returnDate provided
    if (returnDate && !returnTime) {
      return NextResponse.json({ error: 'ต้องระบุเวลากลับเมื่อมีวันที่กลับ' }, { status: 400 });
    }

    // Guard: time without date (defensive)
    if (departureTime && !departureDate) {
      return NextResponse.json({ error: 'มีเวลาออกเดินทาง แต่ไม่ได้ระบุวันที่ออก' }, { status: 400 });
    }
    if (returnTime && !returnDate) {
      return NextResponse.json({ error: 'มีเวลากลับ แต่ไม่ได้ระบุวันที่กลับ' }, { status: 400 });
    }

    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
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

    // คำนวณจำนวนวัน
    const depDate = new Date(departureDate);
    let retDate: Date | null = null;
    let daysDiff = 0;
    if (returnDate) {
      retDate = new Date(returnDate);
      const timeDiff = retDate.getTime() - depDate.getTime();
      daysDiff = timeDiff >= 0 ? Math.ceil(timeDiff / (1000 * 3600 * 24)) : 0;
    }
    
    // ดึงอัตราค่าเบี้ยเลี้ยงจากระบบ
    const allowanceRate = await getAllowanceRateServer();
    const totalAllowance = daysDiff >= 1 ? daysDiff * allowanceRate : 0;

    // คำนวณระยะทางจากเลขไมล์ (ถ้ามี) - สำหรับข้อมูลเสริม
    let calculatedDistanceFromOdometer = null;
    if (odometerBefore && odometerAfter && odometerAfter > odometerBefore) {
      calculatedDistanceFromOdometer = odometerAfter - odometerBefore;
    }

    // สร้าง trip record
    const tripRecord = await prisma.tripRecord.create({
      data: {
        vehicleId: parseInt(vehicleId),
        customerId: parseInt(customerId),
    departureDate: new Date(departureDate),
    departureTime: departureTime || '00:00',
    // store null if not provided (nullable fields)
  // @ts-ignore pending prisma generate (schema now nullable)
  returnDate: returnDate ? new Date(returnDate) : null,
  // @ts-ignore pending prisma generate (schema now nullable)
  returnTime: returnDate ? (returnTime || departureTime || '00:00') : null,
        odometerBefore: odometerBefore ? parseInt(odometerBefore) : null,
        odometerAfter: odometerAfter ? parseInt(odometerAfter) : null,
        actualDistance: actualDistance ? parseFloat(actualDistance) : null,
        estimatedDistance: estimatedDistance ? parseFloat(estimatedDistance) : 0,
        // เก็บ driver license โดยตรง
        // @ts-ignore Prisma client may need regeneration for driverLicense field
        driverLicense: driverLicense || null,
        // เก็บ driver name สำหรับ backward compatibility
        driverName: selectedDriver ? selectedDriver.driverName : (driverName || null),
        // เก็บ driver type
        // @ts-ignore Prisma client may need regeneration for driverType field
        driverType: driverType || null,
        days: daysDiff,
        allowanceRate,
        totalAllowance,
        loadingDate: loadingDate ? new Date(loadingDate) : null,
        distanceCheckFee: distanceCheckFee ? parseFloat(distanceCheckFee) : null,
        fuelCost: fuelCost ? parseFloat(fuelCost) : null,
        tollFee: tollFee ? parseFloat(tollFee) : null,
        repairCost: repairCost ? parseFloat(repairCost) : null,
        documentNumber: documentNumber || null,
        remark,
        createdBy: session.user?.username || session.user?.email || 'system',
      },
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
            vehicleType: true,
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
              }
            }
          }
        }
      },
    });

    // สร้าง trip items ถ้ามี
    if (tripItems && Array.isArray(tripItems) && tripItems.length > 0) {
      await prisma.tripItem.createMany({
        data: tripItems.map((item: any) => ({
          tripRecordId: tripRecord.id,
          itemId: parseInt(item.itemId),
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
          totalPrice: item.totalPrice ? parseFloat(item.totalPrice) : null,
          remark: item.remark || null,
        }))
      });
    }

    // ดึงข้อมูลรวม trip items
    const tripRecordWithItems = await prisma.tripRecord.findUnique({
      where: { id: tripRecord.id },
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
            vehicleType: true,
            carImage: true,
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
      message: 'สร้างบันทึกการเดินทางสำเร็จ',
      trip: tripRecordWithItems,
    });
  } catch (error) {
    console.error('Error creating trip record:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างบันทึกการเดินทาง' },
      { status: 500 }
    );
  }
}
