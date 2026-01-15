import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// GET - ดึงข้อมูลผู้รับจ้างช่วงตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID ไม่ถูกต้อง',
        },
        { status: 400 }
      );
    }

    const result = await prisma.$queryRaw`
      SELECT * FROM subcontractors WHERE id = ${id} LIMIT 1
    ` as any[];

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ไม่พบข้อมูลผู้รับจ้างช่วง',
        },
        { status: 404 }
      );
    }

    const row = result[0];
    const subcontractor = {
      id: row.id,
      subcontractorCode: row.subcontractor_code,
      subcontractorName: row.subcontractor_name,
      contactPerson: row.contact_person,
      phone: row.phone,
      address: row.address,
      remark: row.remark,
      transportType: row.transport_type || 'domestic',
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: subcontractor,
    });
  } catch (error) {
    console.error('Error fetching subcontractor:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถดึงข้อมูลผู้รับจ้างช่วงได้',
      },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลผู้รับจ้างช่วง
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const session = await getServerSession(authOptions);
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID ไม่ถูกต้อง',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      subcontractorCode,
      subcontractorName,
      contactPerson,
      phone,
      address,
      remark,
      transportType,
      isActive,
    } = body;

    // ตรวจสอบว่ามีผู้รับจ้างช่วงอยู่หรือไม่
    const existing = await prisma.$queryRaw`
      SELECT * FROM subcontractors WHERE id = ${id} LIMIT 1
    ` as any[];

    if (existing.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ไม่พบข้อมูลผู้รับจ้างช่วง',
        },
        { status: 404 }
      );
    }

    const existingSubcontractor = existing[0];

    // ตรวจสอบรหัสซ้ำ (ถ้ามีการเปลี่ยนรหัส)
    if (subcontractorCode && subcontractorCode !== existingSubcontractor.subcontractor_code) {
      const duplicateCode = await prisma.$queryRaw`
        SELECT id FROM subcontractors WHERE subcontractor_code = ${subcontractorCode} LIMIT 1
      ` as any[];

      if (duplicateCode.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'รหัสผู้รับจ้างช่วงนี้มีอยู่ในระบบแล้ว',
          },
          { status: 400 }
        );
      }
    }

    const username = session?.user?.username || session?.user?.email || 'system';
    const finalCode = subcontractorCode || existingSubcontractor.subcontractor_code;
    const finalName = subcontractorName || existingSubcontractor.subcontractor_name;
    const finalIsActive = isActive !== undefined ? (isActive ? 1 : 0) : existingSubcontractor.is_active;
    const finalTransportType = transportType || existingSubcontractor.transport_type || 'domestic';

    // อัปเดตข้อมูล
    await prisma.$executeRaw`
      UPDATE subcontractors SET
        subcontractor_code = ${finalCode},
        subcontractor_name = ${finalName},
        contact_person = ${contactPerson || null},
        phone = ${phone || null},
        address = ${address || null},
        remark = ${remark || null},
        transport_type = ${finalTransportType},
        is_active = ${finalIsActive},
        updated_at = NOW(),
        updated_by = ${username}
      WHERE id = ${id}
    `;

    // Get updated data
    const updated = await prisma.$queryRaw`
      SELECT * FROM subcontractors WHERE id = ${id} LIMIT 1
    ` as any[];

    const row = updated[0];
    const updatedSubcontractor = {
      id: row.id,
      subcontractorCode: row.subcontractor_code,
      subcontractorName: row.subcontractor_name,
      contactPerson: row.contact_person,
      phone: row.phone,
      address: row.address,
      remark: row.remark,
      transportType: row.transport_type || 'domestic',
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'แก้ไขข้อมูลผู้รับจ้างช่วงเรียบร้อยแล้ว',
      data: updatedSubcontractor,
    });
  } catch (error) {
    console.error('Error updating subcontractor:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถแก้ไขข้อมูลผู้รับจ้างช่วงได้',
      },
      { status: 500 }
    );
  }
}

// DELETE - ลบผู้รับจ้างช่วง (hard delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID ไม่ถูกต้อง',
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีผู้รับจ้างช่วงอยู่หรือไม่
    const existing = await prisma.$queryRaw`
      SELECT id FROM subcontractors WHERE id = ${id} LIMIT 1
    ` as any[];

    if (existing.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ไม่พบข้อมูลผู้รับจ้างช่วง',
        },
        { status: 404 }
      );
    }

    // ตรวจสอบว่ามีการใช้งานในตารางอื่นหรือไม่ (เผื่ออนาคต)
    // ตัวอย่าง: ถ้ามี trip_records ที่ใช้ subcontractor_id
    // const usageCheck = await prisma.$queryRaw`
    //   SELECT COUNT(*) as count FROM trip_records WHERE subcontractor_id = ${id}
    // ` as any[];
    // 
    // if (usageCheck[0]?.count > 0) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: 'ไม่สามารถลบผู้รับจ้างช่วงที่มีการใช้งานแล้ว',
    //     },
    //     { status: 400 }
    //   );
    // }

    // ลบข้อมูลออกจาก database
    await prisma.$executeRaw`
      DELETE FROM subcontractors WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'ลบผู้รับจ้างช่วงเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('Error deleting subcontractor:', error);

    // ตรวจสอบ foreign key constraint error
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('foreign key constraint') || errorMessage.includes('FOREIGN KEY')) {
      return NextResponse.json(
        {
          success: false,
          error: 'ไม่สามารถลบผู้รับจ้างช่วงที่มีการใช้งานแล้ว',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถลบผู้รับจ้างช่วงได้',
      },
      { status: 500 }
    );
  }
}
