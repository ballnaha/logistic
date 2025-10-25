import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '../../../../lib/prisma';

// GET - ดึงข้อมูลลูกค้าตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID ลูกค้าไม่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่พบข้อมูลลูกค้า' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถดึงข้อมูลลูกค้าได้' 
      },
      { status: 500 }
    );
  }
}

// PUT - อัพเดทข้อมูลลูกค้า
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID ลูกค้าไม่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

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
      isActive,
      updatedBy,
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

    // ตรวจสอบว่ามีลูกค้าอยู่หรือไม่
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่พบข้อมูลลูกค้า' 
        },
        { status: 404 }
      );
    }

    // ตรวจสอบว่ารหัสลูกค้าซ้ำหรือไม่ (ถ้าเปลี่ยนรหัส)
    if (cmCode !== existingCustomer.cmCode) {
      const duplicateCustomer = await prisma.customer.findUnique({
        where: { cmCode },
      });

      if (duplicateCustomer) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'รหัสลูกค้านี้มีอยู่แล้ว' 
          },
          { status: 400 }
        );
      }
    }

    // อัพเดทข้อมูลลูกค้า
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
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
        isActive: isActive !== undefined ? isActive : (existingCustomer as any).isActive, // เพิ่ม isActive field
        updatedBy,
      } as any,
    });

    // revalidate customers listing page
    try {
      revalidatePath('/customers');
    } catch (e) {
      console.warn('revalidatePath(/customers) failed:', e);
    }

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: 'อัพเดทข้อมูลลูกค้าสำเร็จ',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถอัพเดทข้อมูลลูกค้าได้' 
      },
      { status: 500 }
    );
  }
}

// DELETE - ลบข้อมูลลูกค้า
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID ลูกค้าไม่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีลูกค้าอยู่หรือไม่
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่พบข้อมูลลูกค้า' 
        },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าลูกค้ารายนี้ถูกใช้งานใน TripRecord หรือไม่
    const tripRecordCount = await prisma.tripRecord.count({
      where: { customerId: customerId },
    });

    if (tripRecordCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถลบลูกค้ารายนี้ได้ เนื่องจากมีการใช้งานใน Trip Record จำนวน ${tripRecordCount} รายการ\nกรุณาใช้การยกเลิกการใช้งานแทน`,
        },
        { status: 400 }
      );
    }

    // ลบข้อมูลลูกค้า (เฉพาะกรณีที่ไม่มีการใช้งาน)
    await prisma.customer.delete({
      where: { id: customerId },
    });

    // revalidate customers listing page
    try {
      revalidatePath('/customers');
    } catch (e) {
      console.warn('revalidatePath(/customers) failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลลูกค้าสำเร็จ',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถลบข้อมูลลูกค้าได้' 
      },
      { status: 500 }
    );
  }
}

// PATCH - เปลี่ยนสถานะการใช้งาน
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID ลูกค้าไม่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, updatedBy } = body;

    // ตรวจสอบว่ามีลูกค้าอยู่หรือไม่
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่พบข้อมูลลูกค้า' 
        },
        { status: 404 }
      );
    }

    if (action === 'toggle-status') {
      // เปลี่ยนสถานะการใช้งาน
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          isActive: !(existingCustomer as any).isActive,
          updatedBy: updatedBy?.trim() || null,
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
        data: updatedCustomer,
        message: (updatedCustomer as any).isActive
          ? 'เปิดการใช้งานลูกค้าสำเร็จ'
          : 'ยกเลิกการใช้งานลูกค้าสำเร็จ',
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Action ไม่ถูกต้อง' 
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating customer status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถอัปเดตสถานะลูกค้าได้' 
      },
      { status: 500 }
    );
  }
}
