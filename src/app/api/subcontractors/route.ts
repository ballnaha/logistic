import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// GET - ดึงรายการผู้รับจ้างช่วงทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const showInactive = searchParams.get('showInactive') === 'true';

    let query = `
      SELECT * FROM subcontractors 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!showInactive) {
      query += ` AND is_active = 1`;
    }

    if (search) {
      query += ` AND (
        subcontractor_code LIKE ? OR 
        subcontractor_name LIKE ? OR 
        contact_person LIKE ? OR 
        phone LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY created_at DESC`;

    const subcontractors = await prisma.$queryRawUnsafe(query, ...params);

    // Transform snake_case to camelCase and check for references
    const transformedData = await Promise.all(
      (subcontractors as any[]).map(async (row: any) => {
        // ตรวจสอบว่ามีการใช้งานใน evaluations หรือไม่
        const evaluationCheck = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM evaluations 
          WHERE contractor_name = ${row.subcontractor_name}
          LIMIT 1
        ` as any[];

        const hasReferences = evaluationCheck[0]?.count > 0;

        return {
          id: row.id,
          subcontractorCode: row.subcontractor_code,
          subcontractorName: row.subcontractor_name,
          contactPerson: row.contact_person,
          phone: row.phone,
          address: row.address,
          remark: row.remark,
          transportType: row.transport_type || 'domestic',
          isActive: Boolean(row.is_active),
          hasReferences: hasReferences,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
          updatedBy: row.updated_by,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching subcontractors:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถดึงข้อมูลผู้รับจ้างช่วงได้',
      },
      { status: 500 }
    );
  }
}

// POST - เพิ่มผู้รับจ้างช่วงใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const {
      subcontractorCode,
      subcontractorName,
      contactPerson,
      phone,
      address,
      remark,
      transportType,
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!subcontractorCode || !subcontractorName) {
      return NextResponse.json(
        {
          success: false,
          error: 'กรุณาระบุรหัสและชื่อผู้รับจ้างช่วง',
        },
        { status: 400 }
      );
    }

    // ตรวจสอบรหัสซ้ำ
    const existing = await prisma.$queryRaw`
      SELECT id FROM subcontractors WHERE subcontractor_code = ${subcontractorCode} LIMIT 1
    ` as any[];

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'รหัสผู้รับจ้างช่วงนี้มีอยู่ในระบบแล้ว',
        },
        { status: 400 }
      );
    }

    const username = session?.user?.username || session?.user?.email || 'system';

    // สร้างผู้รับจ้างช่วงใหม่
    const finalTransportType = transportType || 'domestic';
    await prisma.$executeRaw`
      INSERT INTO subcontractors (
        subcontractor_code, subcontractor_name, contact_person, phone,
        address, remark, transport_type, is_active, created_at, updated_at, created_by, updated_by
      ) VALUES (
        ${subcontractorCode}, ${subcontractorName}, ${contactPerson || null}, ${phone || null},
        ${address || null}, ${remark || null}, ${finalTransportType}, 1, NOW(), NOW(), ${username}, ${username}
      )
    `;

    // Get the newly created subcontractor
    const newSubcontractor = await prisma.$queryRaw`
      SELECT * FROM subcontractors WHERE subcontractor_code = ${subcontractorCode} LIMIT 1
    ` as any[];

    const transformed = newSubcontractor[0] ? {
      id: newSubcontractor[0].id,
      subcontractorCode: newSubcontractor[0].subcontractor_code,
      subcontractorName: newSubcontractor[0].subcontractor_name,
      contactPerson: newSubcontractor[0].contact_person,
      phone: newSubcontractor[0].phone,
      address: newSubcontractor[0].address,
      remark: newSubcontractor[0].remark,
      transportType: newSubcontractor[0].transport_type || 'domestic',
      isActive: Boolean(newSubcontractor[0].is_active),
      createdAt: newSubcontractor[0].created_at,
      updatedAt: newSubcontractor[0].updated_at,
    } : null;

    return NextResponse.json({
      success: true,
      message: 'เพิ่มผู้รับจ้างช่วงเรียบร้อยแล้ว',
      data: transformed,
    });
  } catch (error) {
    console.error('Error creating subcontractor:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถเพิ่มผู้รับจ้างช่วงได้',
      },
      { status: 500 }
    );
  }
}
