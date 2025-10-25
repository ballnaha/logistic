import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Helper function to build WHERE clause for raw SQL
function buildWhereClause(whereCondition: any): string {
  if (!whereCondition || Object.keys(whereCondition).length === 0) {
    return '';
  }

  const conditions: string[] = [];

  // Helper function to escape SQL strings
  function escapeSql(value: string): string {
    return value.replace(/'/g, "''").replace(/\\/g, "\\\\");
  }

  // Handle status filter
  if (whereCondition.isActive !== undefined) {
    conditions.push(`v.is_active = ${whereCondition.isActive ? 1 : 0}`);
  }

  // Handle search conditions (OR)
  if (whereCondition.OR) {
    const orConditions: string[] = [];
    whereCondition.OR.forEach((condition: any) => {
      if (condition.licensePlate?.contains) {
        orConditions.push(`v.license_plate LIKE '%${escapeSql(condition.licensePlate.contains)}%'`);
      }
      if (condition.brand?.contains) {
        orConditions.push(`v.car_brand LIKE '%${escapeSql(condition.brand.contains)}%'`);
      }
      if (condition.model?.contains) {
        orConditions.push(`v.car_model LIKE '%${escapeSql(condition.model.contains)}%'`);
      }
      if (condition.color?.contains) {
        orConditions.push(`v.car_color LIKE '%${escapeSql(condition.color.contains)}%'`);
      }
      if (condition.vehicleType?.contains) {
        orConditions.push(`v.car_type LIKE '%${escapeSql(condition.vehicleType.contains)}%'`);
      }
    });
    if (orConditions.length > 0) {
      conditions.push(`(${orConditions.join(' OR ')})`);
    }
  }

  // Handle specific filters
  if (whereCondition.brand?.contains) {
    conditions.push(`v.car_brand LIKE '%${escapeSql(whereCondition.brand.contains)}%'`);
  }
  if (whereCondition.vehicleType) {
    conditions.push(`v.car_type = '${escapeSql(whereCondition.vehicleType)}'`);
  }
  if (whereCondition.licensePlate?.contains) {
    conditions.push(`v.license_plate LIKE '%${escapeSql(whereCondition.licensePlate.contains)}%'`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

// GET - ดึงรายการรถ
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
    const brand = searchParams.get('brand') || '';
    const vehicleType = searchParams.get('vehicleType') || '';
    const licensePlate = searchParams.get('licensePlate') || '';
    const status = searchParams.get('status') || 'active'; // active, inactive, all

    const skip = (page - 1) * limit;

    // สร้าง where condition
    const whereCondition: any = {};

    // ตั้งค่า status filter
    if (status === 'active') {
      whereCondition.isActive = true;
    } else if (status === 'inactive') {
      whereCondition.isActive = false;
    }
    // ถ้าเป็น 'all' ก็ไม่ filter isActive

    if (search) {
      whereCondition.OR = [
        { licensePlate: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { color: { contains: search } },
        { vehicleType: { contains: search } },
      ];
    }

    if (brand) {
      whereCondition.brand = { contains: brand };
    }

    if (vehicleType) {
      whereCondition.vehicleType = vehicleType;
    }

    if (licensePlate) {
      whereCondition.licensePlate = { contains: licensePlate };
    }

    // ดึงข้อมูลรถและนับจำนวนทั้งหมด ด้วย Raw SQL เพื่อรวม driver data
    // สร้าง SQL query แบบ dynamic
    const whereClause = buildWhereClause(whereCondition);
    
    const sqlQuery = `
      SELECT 
        v.car_id as id,
        v.license_plate as licensePlate,
        v.car_brand as brand,
        v.car_model as model,
        v.car_color as color,
        v.car_type as vehicleType,
        v.is_active as isActive,
        v.car_weight as weight,
        v.car_fuel_tank as fuelTank,
        v.fuel_consume as fuelConsume,
        v.fuel_comsume_mth as fuelConsumeMth,
        v.car_remark as remark,
        v.car_image as carImage,
        v.created_at as createdAt,
        v.updated_at as updatedAt,
        v.owner_id as ownerId,
        v.created_by as createdBy,
        v.updated_by as updatedBy,
        -- Main driver data
        md.id as mainDriverId,
        md.driver_name as mainDriverName,
        md.driver_license as mainDriverLicense,
        md.driver_image as mainDriverImage,
        -- Backup driver data
        bd.id as backupDriverId,
        bd.driver_name as backupDriverName,
        bd.driver_license as backupDriverLicense,
        bd.driver_image as backupDriverImage
      FROM vehicles v
      LEFT JOIN drivers md ON v.main_driver_id = md.id
      LEFT JOIN drivers bd ON v.backup_driver_id = bd.id
      ${whereClause}
      ORDER BY v.created_at DESC, v.car_id DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicles v
      ${whereClause}
    `;

    const vehiclesRaw = await prisma.$queryRawUnsafe(sqlQuery);
    const totalResult = await prisma.$queryRawUnsafe(countQuery);

    console.log('Vehicles query executed successfully. Rows returned:', (vehiclesRaw as any[]).length);

    const total = Number((totalResult as any[])[0]?.total || 0);

    // Transform raw data to expected format
    const vehicles = (vehiclesRaw as any[]).map(row => ({
      id: row.id,
      licensePlate: row.licensePlate,
      brand: row.brand,
      model: row.model,
      color: row.color,
      vehicleType: row.vehicleType,
      isActive: row.isActive === 1,
      weight: row.weight ? parseFloat(row.weight.toString()) : null,
      fuelTank: row.fuelTank ? parseFloat(row.fuelTank.toString()) : null,
      fuelConsume: row.fuelConsume ? parseFloat(row.fuelConsume.toString()) : null,
      fuelConsumeMth: row.fuelConsumeMth ? parseFloat(row.fuelConsumeMth.toString()) : null,
      remark: row.remark,
      carImage: row.carImage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ownerId: row.ownerId,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      mainDriver: row.mainDriverId ? {
        id: row.mainDriverId,
        driverName: row.mainDriverName,
        driverLicense: row.mainDriverLicense,
        driverImage: row.mainDriverImage,
      } : null,
      backupDriver: row.backupDriverId ? {
        id: row.backupDriverId,
        driverName: row.backupDriverName,
        driverLicense: row.backupDriverLicense,
        driverImage: row.backupDriverImage,
      } : null,
    }));

    // ดึงข้อมูล owners แยกต่างหาก (เฉพาะที่จำเป็น)
    const ownerIds = [...new Set(vehicles.map(v => v.ownerId))];
    const owners = await prisma.user.findMany({
      where: {
        id: { in: ownerIds }
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      }
    });

    // รวมข้อมูล owner เข้ากับ vehicles
    const vehiclesWithOwners = vehicles.map(vehicle => ({
      ...vehicle,
      owner: owners.find((owner: any) => owner.id === vehicle.ownerId) || null
    }));

    return NextResponse.json({
      success: true,
      data: vehiclesWithOwners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch vehicles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - เพิ่มรถใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ตรวจสอบ user ID
    if (!session.user.id) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    // Debug logging
    console.log('Session user:', {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email
    });

    // ตรวจสอบว่า user มีอยู่ในฐานข้อมูลหรือไม่
    const userId = parseInt(session.user.id.toString());
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      console.error('User not found in database:', userId);
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาลงชื่อเข้าใช้ใหม่' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      // ข้อมูลหลัก
      licensePlate,
      brand,
      model,
      color,
      weight,
      fuelTank,
      fuelConsume,
      fuelConsumeMth,
      vehicleType,
      // คนขับ (Driver relationships)
      mainDriverId,
      backupDriverId,
      // อื่นๆ
      remark,
      carImage,
    } = body;

    // Validation - เฉพาะ field ที่จำเป็น
    if (!licensePlate || !brand || !vehicleType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: ทะเบียนรถ, ยี่ห้อรถ, ประเภทรถ' },
        { status: 400 }
      );
    }

    // ตรวจสอบทะเบียนรถซ้ำ
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        licensePlate: licensePlate,
        isActive: true
      }
    });

    if (existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    // สร้างรถใหม่
    const vehicle = await prisma.vehicle.create({
      data: {
        // ข้อมูลหลักใหม่
        licensePlate,
        brand,
        model,
        color,
        weight: weight ? parseFloat(weight) : null,
        fuelTank: fuelTank ? parseFloat(fuelTank) : null,
        fuelConsume: fuelConsume ? parseFloat(fuelConsume) : null,
        fuelConsumeMth: fuelConsumeMth ? parseFloat(fuelConsumeMth) : null,
        vehicleType,
        // อื่นๆ
        remark,
        carImage,
        // ข้อมูลเพิ่มเติม (เฉพาะที่จำเป็น)
        isActive: true,
        ownerId: userId,
        createdBy: existingUser.username || existingUser.email || 'unknown',
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // อัปเดตข้อมูลคนขับแยกต่างหาก (ใช้ raw SQL เพื่อหลีกเลี่ยงปัญหา Prisma client)
    if (mainDriverId || backupDriverId) {
      console.log('Updating driver assignments:', { 
        vehicleId: vehicle.id, 
        mainDriverId, 
        backupDriverId 
      });
      
      // ตรวจสอบว่าคนขับมีอยู่จริงก่อนบันทึก
      if (mainDriverId) {
        const mainDriverExists = await prisma.$queryRaw`
          SELECT id FROM drivers WHERE id = ${parseInt(mainDriverId.toString())} AND is_active = 1
        `;
        if (!Array.isArray(mainDriverExists) || mainDriverExists.length === 0) {
          console.error('Main driver not found:', mainDriverId);
          // ลบรถที่สร้างไปแล้วและ return error
          await prisma.vehicle.delete({ where: { id: vehicle.id } });
          return NextResponse.json(
            { success: false, error: 'ไม่พบข้อมูลคนขับหลักที่เลือก' },
            { status: 400 }
          );
        }
      }
      
      if (backupDriverId) {
        const backupDriverExists = await prisma.$queryRaw`
          SELECT id FROM drivers WHERE id = ${parseInt(backupDriverId.toString())} AND is_active = 1
        `;
        if (!Array.isArray(backupDriverExists) || backupDriverExists.length === 0) {
          console.error('Backup driver not found:', backupDriverId);
          // ลบรถที่สร้างไปแล้วและ return error
          await prisma.vehicle.delete({ where: { id: vehicle.id } });
          return NextResponse.json(
            { success: false, error: 'ไม่พบข้อมูลคนขับรองที่เลือก' },
            { status: 400 }
          );
        }
      }
      
      // อัปเดตความสัมพันธ์คนขับ
      await prisma.$executeRaw`
        UPDATE vehicles 
        SET main_driver_id = ${mainDriverId || null}, 
            backup_driver_id = ${backupDriverId || null}
        WHERE car_id = ${vehicle.id}
      `;
      
      console.log('Driver assignments updated successfully');
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle,
    });
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    
    // ตรวจสอบประเภท error
    if (error.code === 'P2003') {
      console.error('Foreign key constraint violation:', error.meta);
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ถูกต้อง: ไม่พบผู้ใช้ในระบบ' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการสร้างข้อมูลรถ',
        details: error.message
      },
      { status: 500 }
    );
  }
}
