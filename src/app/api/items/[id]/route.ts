import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - ดึงข้อมูล Item ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลพัสดุ' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });

  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลพัสดุได้' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูล Item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      ptPart,
      ptDesc1,
      ptDesc2,
      ptUm,
      ptPrice,
      isActive,
      updatedBy,
    } = body;

    // ตรวจสอบว่า Item มีอยู่หรือไม่
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลพัสดุ' },
        { status: 404 }
      );
    }

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

    // ตรวจสอบว่ารหัสพัสดุซ้ำหรือไม่ (ยกเว้นตัวเอง)
    if (ptPart.trim() !== existingItem.ptPart) {
      const duplicateItem = await prisma.item.findUnique({
        where: { ptPart: ptPart.trim() },
      });

      if (duplicateItem) {
        return NextResponse.json(
          { success: false, error: 'รหัสพัสดุนี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    // อัปเดต Item
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        ptPart: ptPart.trim(),
        ptDesc1: ptDesc1.trim(),
        ptDesc2: ptDesc2?.trim() || null,
        ptUm: ptUm.trim(),
        ptPrice: ptPrice ? parseFloat(ptPrice) : null,
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        updatedBy: updatedBy?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'อัปเดตข้อมูลพัสดุสำเร็จ',
    });

  } catch (error) {
    console.error('Error updating item:', error);
    
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
      { success: false, error: 'ไม่สามารถอัปเดตข้อมูลพัสดุได้' },
      { status: 500 }
    );
  }
}

// DELETE - ลบ Item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า Item มีอยู่หรือไม่
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลพัสดุ' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าพัสดุรายการนี้ถูกใช้งานใน TripItem หรือไม่
    const tripItemCount = await prisma.tripItem.count({
      where: { itemId: itemId },
    });

    if (tripItemCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถลบพัสดุรายการนี้ได้ เนื่องจากมีการใช้งานใน Trip Record จำนวน ${tripItemCount} รายการ\nกรุณาใช้การยกเลิกการใช้งานแทน`,
        },
        { status: 400 }
      );
    }

    // ลบ Item (เฉพาะกรณีที่ไม่มีการใช้งาน)
    await prisma.item.delete({
      where: { id: itemId },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลพัสดุสำเร็จ',
    });

  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถลบข้อมูลพัสดุได้' },
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
    const itemId = parseInt(resolvedParams.id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, updatedBy } = body;

    // ตรวจสอบว่า Item มีอยู่หรือไม่
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลพัสดุ' },
        { status: 404 }
      );
    }

    if (action === 'toggle-status') {
      // เปลี่ยนสถานะการใช้งาน
      const updatedItem = await prisma.item.update({
        where: { id: itemId },
        data: {
          isActive: !(existingItem as any).isActive,
          updatedBy: updatedBy?.trim() || null,
        } as any,
      });

      return NextResponse.json({
        success: true,
        data: updatedItem,
        message: (updatedItem as any).isActive
          ? 'เปิดการใช้งานพัสดุสำเร็จ'
          : 'ยกเลิกการใช้งานพัสดุสำเร็จ',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Action ไม่ถูกต้อง' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating item status:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถอัปเดตสถานะพัสดุได้' },
      { status: 500 }
    );
  }
}
