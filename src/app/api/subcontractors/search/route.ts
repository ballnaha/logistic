import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real-time subcontractor search API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!query.trim()) {
      return NextResponse.json({
        data: [],
        total: 0
      });
    }

    // ค้นหา subcontractor
    const searchPattern = `%${query}%`;
    const subcontractors = await prisma.$queryRaw`
      SELECT * FROM subcontractors 
      WHERE is_active = 1
        AND (
          subcontractor_code LIKE ${searchPattern} OR 
          subcontractor_name LIKE ${searchPattern} OR 
          contact_person LIKE ${searchPattern} OR 
          phone LIKE ${searchPattern}
        )
      ORDER BY subcontractor_name ASC
      LIMIT ${limit}
    ` as any[];
    
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
      total: subcontractors.length,
      hasMore: subcontractors.length >= limit
    });
  } catch (error: any) {
    console.error('Error searching subcontractors:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการค้นหาผู้รับจ้างช่วง', error: error.message },
      { status: 500 }
    );
  }
}
