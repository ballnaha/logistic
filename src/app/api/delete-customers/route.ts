import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE - ลบลูกค้าตาม customer codes หรือ customer IDs
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerIds, customerCodes, deletedBy } = body;

    if ((!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) &&
        (!customerCodes || !Array.isArray(customerCodes) || customerCodes.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'customerIds หรือ customerCodes จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    console.log(`🗑️ เริ่มลบลูกค้า ${customerIds?.length || customerCodes?.length} ราย...`);

    // สร้าง where condition
    const whereCondition: any = {};
    if (customerIds && customerIds.length > 0) {
      whereCondition.id = { in: customerIds };
    } else if (customerCodes && customerCodes.length > 0) {
      whereCondition.cmCode = { in: customerCodes };
    }

    // ตรวจสอบลูกค้าที่มีอยู่และลูกค้าที่มี trip records
    const existingCustomers = await prisma.customer.findMany({
      where: whereCondition,
      include: {
        tripRecords: {
          select: { id: true },
          take: 1
        }
      }
    });

    if (existingCustomers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบลูกค้าที่ต้องการลบ'
      }, { status: 404 });
    }

    // แยกลูกค้าที่สามารถลบได้และไม่สามารถลบได้
    const canDelete = existingCustomers.filter(customer => 
      !customer.tripRecords || customer.tripRecords.length === 0
    );
    const cannotDelete = existingCustomers.filter(customer => 
      customer.tripRecords && customer.tripRecords.length > 0
    );

    let deletedCount = 0;
    const results: Array<{id: number; code: string; name: string; status: string}> = [];
    const errors: Array<{id: number; code: string; name: string; error: string}> = [];

    // ลบลูกค้าที่สามารถลบได้
    if (canDelete.length > 0) {
      try {
        const deleteResult = await prisma.customer.deleteMany({
          where: {
            id: { in: canDelete.map(c => c.id) }
          }
        });
        
        deletedCount = deleteResult.count;
        
        canDelete.forEach(customer => {
          results.push({
            id: customer.id,
            code: customer.cmCode,
            name: customer.cmName,
            status: 'deleted'
          });
        });

        console.log(`✅ ลบลูกค้าสำเร็จ ${deletedCount} ราย`);
      } catch (error: any) {
        console.error('Error deleting customers:', error);
        canDelete.forEach(customer => {
          errors.push({
            id: customer.id,
            code: customer.cmCode,
            name: customer.cmName,
            error: 'เกิดข้อผิดพลาดในการลบ'
          });
        });
      }
    }

    // เพิ่มลูกค้าที่ไม่สามารถลบได้
    cannotDelete.forEach(customer => {
      errors.push({
        id: customer.id,
        code: customer.cmCode,
        name: customer.cmName,
        error: 'มีบันทึกการเดินทางที่เกี่ยวข้อง'
      });
    });

    const summary = {
      total: existingCustomers.length,
      deleted: deletedCount,
      failed: cannotDelete.length + (canDelete.length - deletedCount),
      cannotDelete: cannotDelete.length
    };

    console.log(`📊 สรุปผลการลบ:`, summary);

    return NextResponse.json({
      success: true,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined,
      message: `ลบลูกค้าสำเร็จ ${deletedCount} ราย${cannotDelete.length > 0 ? `, ไม่สามารถลบได้ ${cannotDelete.length} ราย (มีบันทึกการเดินทาง)` : ''}`
    });

  } catch (error: any) {
    console.error('Error in customer deletion:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}