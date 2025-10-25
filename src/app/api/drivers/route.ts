import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';

// GET - ดึงรายการคนขับทั้งหมด (พร้อม pagination และ search)
export async function GET(request: NextRequest) {
  try {
    console.log('Drivers API: Starting request processing');
    
    // ใช้ timeout สำหรับ session check
    const sessionPromise = getServerSession(authOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout')), 5000)
    );
    
    const session = await Promise.race([sessionPromise, timeoutPromise]) as any;
    console.log('Drivers API: Session check result:', session ? 'authenticated' : 'not authenticated');
    
    if (!session?.user) {
      console.log('Drivers API: No session found, returning 401');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized',
        message: 'กรุณาเข้าสู่ระบบใหม่' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'driverName';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const status = searchParams.get('status') || 'all'; // รองรับ status filter
    const isActiveFilter = searchParams.get('isActive'); // เก็บไว้เพื่อ backward compatibility

    const skip = (page - 1) * limit;

    // สร้าง where condition สำหรับการค้นหา
    const whereCondition: any = {};
    
    // Add search condition
    if (search) {
      whereCondition.OR = [
        { driverName: { contains: search } },
        { driverLicense: { contains: search } },
        { phone: { contains: search } },
        { remark: { contains: search } },
      ];
    }
    
    // Add status filter condition
    if (status && status !== 'all') {
      if (status === 'active') {
        whereCondition.isActive = true;
      } else if (status === 'inactive') {
        whereCondition.isActive = false;
      }
    }
    
    // Backward compatibility: Add isActive filter condition
    if (isActiveFilter !== null && isActiveFilter !== '') {
      whereCondition.isActive = isActiveFilter === 'true';
    }

    // สร้าง orderBy condition
    const orderByCondition: any = {};
    orderByCondition[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';

    // Debug log
    console.log('Drivers API: Query parameters:', { 
      page, limit, search, status, isActiveFilter 
    });
    console.log('Drivers API: Where condition:', whereCondition);

    // ดึงข้อมูลคนขับทั้งหมด (Optimized with selective fields and timeout)
    console.log('Drivers API: Executing database queries...');
    const [drivers, totalCount] = await Promise.all([
      Promise.race([
        prisma.driver.findMany({
          where: whereCondition,
          select: {
            // ข้อมูลหลักของคนขับ (เฉพาะที่แสดงในตาราง)
            id: true,
            driverName: true,
            driverLicense: true,
            driverImage: true,
            phone: true,
            remark: true,
            isActive: true,
            // ข้อมูลระบบ (สำหรับ sorting เท่านั้น)
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            updatedBy: true,
          },
          skip,
          take: limit,
          orderBy: [
            orderByCondition,
            { id: 'desc' } // secondary sort for consistency
          ],
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]),
      Promise.race([
        prisma.driver.count({
          where: whereCondition,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Count query timeout')), 3000)
        )
      ]),
    ]);

    const totalPages = Math.ceil((totalCount as number) / limit);

    console.log('Drivers API: Returning response with', (drivers as any[]).length, 'drivers');

    return NextResponse.json({
      drivers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    
    // Check if it's a session timeout
    if (error instanceof Error && error.message === 'Session timeout') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session timeout',
          message: 'การตรวจสอบสิทธิ์หมดเวลา กรุณาลองใหม่' 
        },
        { status: 408 }
      );
    }
    
    // Check if it's a database timeout
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database timeout',
          message: 'การเชื่อมต่อฐานข้อมูลหมดเวลา กรุณาลองใหม่' 
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'ไม่สามารถดึงข้อมูลคนขับได้ กรุณาลองใหม่' 
      },
      { status: 500 }
    );
  }
}

// POST - เพิ่มคนขับใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      driverName,
      driverLicense,
      driverImage,
      phone,
      remark,
      isActive = true, // default เป็น true ถ้าไม่ส่งมา
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!driverName || !driverLicense) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณากรอกชื่อคนขับและเลขใบขับขี่' 
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าเลขใบขับขี่ซ้ำหรือไม่
    const existingDriver = await prisma.driver.findUnique({
      where: { driverLicense },
    });

    if (existingDriver) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'เลขใบขับขี่นี้มีอยู่แล้ว' 
        },
        { status: 400 }
      );
    }

    // สร้างคนขับใหม่
    const newDriver = await prisma.driver.create({
      data: {
        driverName,
        driverLicense,
        driverImage,
        phone,
        remark,
        isActive,
        createdBy: session.user.name || session.user.email,
      },
    });

    // revalidate drivers listing page
    try {
      revalidatePath('/drivers');
    } catch (e) {
      console.warn('revalidatePath(/drivers) failed:', e);
    }

    return NextResponse.json({
      success: true,
      data: newDriver,
      message: 'เพิ่มข้อมูลคนขับสำเร็จ',
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถเพิ่มข้อมูลคนขับได้' 
      },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลคนขับ
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      driverName,
      driverLicense,
      driverImage,
      phone,
      remark,
      isActive = true,
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณาระบุ ID คนขับ' 
        },
        { status: 400 }
      );
    }

    // หากเป็นการอัพเดทเฉพาะรูปภาพ
    if (driverImage && Object.keys(body).length === 2) { // id + driverImage only
      const updatedDriver = await prisma.driver.update({
        where: { id: parseInt(id) },
        data: {
          driverImage,
          updatedBy: session.user.name || session.user.email,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedDriver,
        message: 'อัพเดทรูปภาพสำเร็จ',
      });
    }

    // การอัพเดทข้อมูลปกติ
    if (!driverName || !driverLicense) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณากรอกชื่อคนขับและเลขใบขับขี่' 
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าคนขับที่จะแก้ไขมีอยู่หรือไม่
    const existingDriver = await prisma.driver.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingDriver) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่พบข้อมูลคนขับที่ต้องการแก้ไข' 
        },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าเลขใบขับขี่ซ้ำกับคนขับคนอื่นหรือไม่ (ยกเว้นตัวเอง)
    const duplicateDriver = await prisma.driver.findFirst({
      where: {
        driverLicense,
        id: { not: parseInt(id) }, // ยกเว้นตัวเอง
      },
    });

    if (duplicateDriver) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'เลขใบขับขี่นี้มีอยู่แล้วในระบบ' 
        },
        { status: 400 }
      );
    }

    // อัพเดทข้อมูลคนขับ
    const updatedDriver = await prisma.driver.update({
      where: { id: parseInt(id) },
      data: {
        driverName,
        driverLicense,
        driverImage,
        phone,
        remark,
        isActive,
        updatedBy: session.user.name || session.user.email,
        updatedAt: new Date(),
      },
    });

    // revalidate drivers listing page
    try {
      revalidatePath('/drivers');
    } catch (e) {
      console.warn('revalidatePath(/drivers) failed:', e);
    }

    return NextResponse.json({
      success: true,
      data: updatedDriver,
      message: 'แก้ไขข้อมูลคนขับสำเร็จ',
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถแก้ไขข้อมูลคนขับได้' 
      },
      { status: 500 }
    );
  }
}
