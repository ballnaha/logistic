import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - ดึงรายการ Items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const isActiveParam = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // สร้าง where condition สำหรับการค้นหา และ filter
    let where: any = {};
    
    // เพิ่ม search condition
    if (search) {
      where.OR = [
        { ptPart: { contains: search } },
        { ptDesc1: { contains: search } },
        { ptDesc2: { contains: search } },
        { ptUm: { contains: search } },
      ];
    }

    // เพิ่ม isActive filter
    if (isActiveParam !== null && isActiveParam !== '') {
      where.isActive = isActiveParam === 'true';
    }

    // ดึงข้อมูล Items พร้อม pagination (Optimized with selective fields and timeout)
    const [items, total] = await Promise.all([
      Promise.race([
        prisma.item.findMany({
          where,
          select: {
            // ข้อมูลหลักของพัสดุ (เฉพาะที่แสดงในตาราง)
            id: true,
            ptPart: true,
            ptDesc1: true,
            ptDesc2: true,
            ptUm: true,
            ptPrice: true,
            isActive: true,
            // ข้อมูลระบบ (สำหรับ sorting เท่านั้น)
            createdAt: true,
            updatedAt: true,
            // เพิ่มการตรวจสอบว่าเคยถูกใช้งานหรือไม่
            _count: {
              select: {
                tripItems: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: [
            { createdAt: 'desc' }, // Default sort by created date
            { id: 'desc' } // secondary sort for consistency
          ],
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 8000)
        )
      ]),
      Promise.race([
        prisma.item.count({ where }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Count query timeout')), 5000)
        )
      ]),
    ]);

    const totalPages = Math.ceil((total as number) / limit);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลพัสดุได้' },
      { status: 500 }
    );
  }
}

// POST - เพิ่ม Item ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ptPart,
      ptDesc1,
      ptDesc2,
      ptUm,
      ptPrice,
      isActive,
      createdBy,
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!ptPart?.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัสพัสดุ' },
        { status: 400 }
      );
    }

    if (!ptDesc1?.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกคำอธิบายหลัก' },
        { status: 400 }
      );
    }

    if (!ptUm?.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกหน่วยนับ' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ารหัสพัสดุซ้ำหรือไม่
    const existingItem = await prisma.item.findUnique({
      where: { ptPart: ptPart.trim() },
    });

    if (existingItem) {
      return NextResponse.json(
        { success: false, error: 'รหัสพัสดุนี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    // สร้าง Item ใหม่
    const newItem = await prisma.item.create({
      data: {
        ptPart: ptPart.trim(),
        ptDesc1: ptDesc1.trim(),
        ptDesc2: ptDesc2?.trim() || null,
        ptUm: ptUm.trim(),
        ptPrice: ptPrice ? parseFloat(ptPrice) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdBy: createdBy?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: newItem,
      message: 'เพิ่มข้อมูลพัสดุสำเร็จ',
    });

  } catch (error) {
    console.error('Error creating item:', error);
    
    // ตรวจสอบ error แบบต่างๆ
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'รหัสพัสดุนี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'ไม่สามารถเพิ่มข้อมูลพัสดุได้' },
      { status: 500 }
    );
  }
}
