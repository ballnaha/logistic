import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '../../../lib/prisma';

// GET - ดึงรายการลูกค้าทั้งหมด (พร้อม pagination และ search)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'cmCode';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const isActiveFilter = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // สร้าง where condition สำหรับการค้นหา
    const whereCondition: any = {};
    
    // Add search condition
    if (search) {
      whereCondition.OR = [
        { cmCode: { contains: search } },
        { cmName: { contains: search } },
        { cmAddress: { contains: search } },
        { cmPhone: { contains: search } },
        { cmSalesname: { contains: search } },
        { cmRemark: { contains: search } },
      ];
    }
    
    // Add isActive filter condition
    if (isActiveFilter !== null && isActiveFilter !== '') {
      whereCondition.isActive = isActiveFilter === 'true';
    }

    // สร้าง orderBy condition
    const orderByCondition: any = {};
    if (sortBy === 'cmMileage') {
      // Special handling for Decimal fields - handle null values
      orderByCondition[sortBy] = {
        sort: sortOrder === 'desc' ? 'desc' : 'asc',
        nulls: 'last'
      };
    } else {
      orderByCondition[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    }

    // ดึงข้อมูลลูกค้าทั้งหมด (Optimized with selective fields and timeout)
    const [customers, totalCount] = await Promise.all([
      Promise.race([
        prisma.customer.findMany({
          where: whereCondition,
          select: {
            // ข้อมูลหลักของลูกค้า (เฉพาะที่แสดงในตาราง)
            id: true,
            cmCode: true,
            cmName: true,
            cmAddress: true,
            cmPhone: true,
            cmSalesname: true,
            cmMileage: true,
            cmRemark: true, // เพิ่ม cmRemark field
            lat: true,
            long: true,
            isActive: true, // เพิ่ม isActive field
            // ข้อมูลระบบ (สำหรับ sorting เท่านั้น)
            createdAt: true,
            updatedAt: true,
            // เช็คว่ามี trip records ที่อ้างอิงหรือไม่
            tripRecords: {
              select: { id: true },
              take: 1 // ดึงแค่ 1 record เพื่อเช็คว่ามีหรือไม่
            },
          },
          skip,
          take: limit,
          orderBy: [
            orderByCondition,
            { id: 'desc' } // secondary sort for consistency
          ],
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 8000)
        )
      ]),
      Promise.race([
        prisma.customer.count({
          where: whereCondition,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Count query timeout')), 5000)
        )
      ]),
    ]);

    const totalPages = Math.ceil((totalCount as number) / limit);

    // เพิ่ม hasReferences field ให้แต่ละ customer
    const customersWithReferences = (customers as any[]).map((customer: any) => ({
      ...customer,
      hasReferences: customer.tripRecords && customer.tripRecords.length > 0,
      tripRecords: undefined // ลบ field ที่ไม่จำเป็นออก
    }));

    return NextResponse.json({
      success: true,
      data: customersWithReferences,
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
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถดึงข้อมูลลูกค้าได้' 
      },
      { status: 500 }
    );
  }
}

// POST - เพิ่มลูกค้าใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cmCode,
      cmName,
      cmAddress,
      cmPhone,
      cmSalesname,
      cmMileage,
      cmRemark,
      lat,
      long,
      isActive = true, // default เป็น true ถ้าไม่ส่งมา
      createdBy,
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!cmCode || !cmName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณากรอกรหัสลูกค้าและชื่อลูกค้า' 
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ารหัสลูกค้าซ้ำหรือไม่
    const existingCustomer = await prisma.customer.findUnique({
      where: { cmCode },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'รหัสลูกค้านี้มีอยู่แล้ว' 
        },
        { status: 400 }
      );
    }

    // สร้างลูกค้าใหม่
    const newCustomer = await prisma.customer.create({
      data: {
        cmCode,
        cmName,
        cmAddress,
        cmPhone,
        cmSalesname,
        cmMileage: cmMileage ? parseFloat(cmMileage) : null,
        cmRemark,
        lat: lat ? parseFloat(lat) : null,
        long: long ? parseFloat(long) : null,
        isActive,
        createdBy,
      },
    });

    // revalidate customers listing page
    try {
      revalidatePath('/customers');
    } catch (e) {
      console.warn('revalidatePath(/customers) failed:', e);
    }

    return NextResponse.json({
      success: true,
      data: newCustomer,
      message: 'เพิ่มข้อมูลลูกค้าสำเร็จ',
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถเพิ่มข้อมูลลูกค้าได้' 
      },
      { status: 500 }
    );
  }
}
