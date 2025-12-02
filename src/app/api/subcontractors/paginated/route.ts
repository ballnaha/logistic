import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Paginated subcontractor API for better performance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;
    
    // ดึงข้อมูล subcontractors
    let subcontractors: any[];
    let total: number;
    
    if (search.trim()) {
      const searchPattern = `%${search}%`;
      
      subcontractors = await prisma.$queryRaw`
        SELECT * FROM subcontractors 
        WHERE is_active = 1
          AND (
            subcontractor_code LIKE ${searchPattern} OR 
            subcontractor_name LIKE ${searchPattern} OR 
            contact_person LIKE ${searchPattern} OR 
            phone LIKE ${searchPattern}
          )
        ORDER BY subcontractor_name ASC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
      
      const countResult = await prisma.$queryRaw`
        SELECT COUNT(*) as total FROM subcontractors 
        WHERE is_active = 1
          AND (
            subcontractor_code LIKE ${searchPattern} OR 
            subcontractor_name LIKE ${searchPattern} OR 
            contact_person LIKE ${searchPattern} OR 
            phone LIKE ${searchPattern}
          )
      ` as any[];
      
      total = countResult[0]?.total || 0;
    } else {
      subcontractors = await prisma.$queryRaw`
        SELECT * FROM subcontractors 
        WHERE is_active = 1
        ORDER BY subcontractor_name ASC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
      
      const countResult = await prisma.$queryRaw`
        SELECT COUNT(*) as total FROM subcontractors 
        WHERE is_active = 1
      ` as any[];
      
      total = countResult[0]?.total || 0;
    }
    
    // แปลงเป็น format ที่ต้องการ (คล้ายกับ VendorOption)
    const subcontractorOptions = subcontractors.map((sub) => ({
      code: sub.subcontractor_code || '',
      name: sub.subcontractor_name || '',
      fullName: `${sub.subcontractor_code} - ${sub.subcontractor_name}`,
      contactPerson: sub.contact_person || '',
      phone: sub.phone || '',
      address: sub.address || '',
      remark: sub.remark || '',
    }));
    
    return NextResponse.json({
      data: subcontractorOptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: (page * limit) < total
      }
    });
  } catch (error: any) {
    console.error('Error fetching paginated subcontractors:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้รับจ้างช่วง', error: error.message },
      { status: 500 }
    );
  }
}
