import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: ดึงแบบประเมินรายการเดียว
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const evaluation = await (prisma as any).evaluation.findUnique({
      where: { id: id }
    });

    if (!evaluation) {
      return NextResponse.json(
        { message: 'ไม่พบแบบประเมินที่ระบุ' },
        { status: 404 }
      );
    }

    // Calculate total score based on transport type
    let totalScore = 0;
    if (evaluation.transportType === 'international') {
      // International: containerCondition(3) + punctuality(3) + productDamage(4) = max 10
      totalScore = (evaluation.containerCondition || 0) +
        (evaluation.punctuality || 0) +
        (evaluation.productDamage || 0);
    } else {
      // Domestic: driverCooperation(4) + vehicleCondition(3) + damageScore(3) = max 10
      totalScore = (evaluation.driverCooperation || 0) +
        (evaluation.vehicleCondition || 0) +
        (evaluation.damageScore || 0);
    }

    return NextResponse.json({
      ...evaluation,
      totalScore
    });
  } catch (error: any) {
    console.error('Error fetching evaluation:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบบประเมิน', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT: แก้ไขแบบประเมิน
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      contractorName,
      vehiclePlate,
      evaluationDate,
      site,
      transportType = 'domestic',
      // Domestic fields
      driverCooperation,
      vehicleCondition,
      damageFound,
      damageValue,
      damageScore,
      // International fields
      containerCondition,
      punctuality,
      productDamage,
      // Common fields
      remark
    } = body;

    // Basic validation
    if (!contractorName || !vehiclePlate || !evaluationDate || !site) {
      return NextResponse.json(
        { message: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Validation based on transport type
    if (transportType === 'international') {
      // International validation
      if (containerCondition === undefined || containerCondition === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุสภาพตู้คอนเทนเนอร์' },
          { status: 400 }
        );
      }
      if (![0, 1, 2, 3].includes(containerCondition)) {
        return NextResponse.json(
          { message: 'คะแนนสภาพตู้คอนเทนเนอร์ไม่ถูกต้อง (0-3)' },
          { status: 400 }
        );
      }
      if (punctuality === undefined || punctuality === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุการตรงต่อเวลา' },
          { status: 400 }
        );
      }
      if (![0, 1, 2, 3].includes(punctuality)) {
        return NextResponse.json(
          { message: 'คะแนนการตรงต่อเวลาไม่ถูกต้อง (0-3)' },
          { status: 400 }
        );
      }
      if (productDamage === undefined || productDamage === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุความเสียหายของสินค้า' },
          { status: 400 }
        );
      }
      if (![0, 1, 2, 3, 4].includes(productDamage)) {
        return NextResponse.json(
          { message: 'คะแนนความเสียหายของสินค้าไม่ถูกต้อง (0-4)' },
          { status: 400 }
        );
      }
    } else {
      // Domestic validation
      if (driverCooperation === undefined || driverCooperation === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุการให้ความร่วมมือของคนรถ' },
          { status: 400 }
        );
      }
      if (![1, 2, 3, 4].includes(driverCooperation)) {
        return NextResponse.json(
          { message: 'คะแนนความร่วมมือไม่ถูกต้อง (1-4)' },
          { status: 400 }
        );
      }
      if (vehicleCondition === undefined || vehicleCondition === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุสภาพความพร้อมของรถขนส่ง' },
          { status: 400 }
        );
      }
      if (![0, 3].includes(vehicleCondition)) {
        return NextResponse.json(
          { message: 'คะแนนสภาพรถไม่ถูกต้อง (0 หรือ 3)' },
          { status: 400 }
        );
      }
      if (damageFound === undefined) {
        return NextResponse.json(
          { message: 'กรุณาระบุความเสียหายของพัสดุ' },
          { status: 400 }
        );
      }
      if (damageFound && (!damageValue || damageValue < 0)) {
        return NextResponse.json(
          { message: 'กรุณากรอกมูลค่าความเสียหายที่ถูกต้อง' },
          { status: 400 }
        );
      }
    }

    // Check if evaluation exists
    const existingEvaluation = await (prisma as any).evaluation.findUnique({
      where: { id: id }
    });

    if (!existingEvaluation) {
      return NextResponse.json(
        { message: 'ไม่พบแบบประเมินที่ระบุ' },
        { status: 404 }
      );
    }

    // Build update data based on transport type
    const updateData: any = {
      contractorName,
      vehiclePlate,
      evaluationDate: new Date(evaluationDate),
      site,
      transportType,
      remark: remark || '',
      updatedAt: new Date()
    };

    if (transportType === 'international') {
      // International fields
      updateData.containerCondition = containerCondition;
      updateData.punctuality = punctuality;
      updateData.productDamage = productDamage;
      // Set domestic fields to null/default
      updateData.driverCooperation = null;
      updateData.vehicleCondition = null;
      updateData.damageFound = false;
      updateData.damageValue = 0;
      updateData.damageScore = 0;
    } else {
      // Domestic fields
      updateData.driverCooperation = driverCooperation;
      updateData.vehicleCondition = vehicleCondition;
      updateData.damageFound = damageFound;
      updateData.damageValue = damageValue || 0;
      updateData.damageScore = damageScore || 0;
      // Set international fields to null
      updateData.containerCondition = null;
      updateData.punctuality = null;
      updateData.productDamage = null;
    }

    // Update evaluation
    const updatedEvaluation = await (prisma as any).evaluation.update({
      where: { id: id },
      data: updateData
    });

    // Calculate total score based on transport type
    let totalScore = 0;
    if (transportType === 'international') {
      totalScore = (updatedEvaluation.containerCondition || 0) +
        (updatedEvaluation.punctuality || 0) +
        (updatedEvaluation.productDamage || 0);
    } else {
      totalScore = (updatedEvaluation.driverCooperation || 0) +
        (updatedEvaluation.vehicleCondition || 0) +
        (updatedEvaluation.damageScore || 0);
    }

    return NextResponse.json({
      ...updatedEvaluation,
      totalScore
    });
  } catch (error: any) {
    console.error('Error updating evaluation:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการแก้ไขแบบประเมิน', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE: ลบแบบประเมิน
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Check if evaluation exists
    const existingEvaluation = await (prisma as any).evaluation.findUnique({
      where: { id: id }
    });

    if (!existingEvaluation) {
      return NextResponse.json(
        { message: 'ไม่พบแบบประเมินที่ระบุ' },
        { status: 404 }
      );
    }

    // Delete evaluation
    await (prisma as any).evaluation.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: 'ลบแบบประเมินเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Error deleting evaluation:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการลบแบบประเมิน', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
